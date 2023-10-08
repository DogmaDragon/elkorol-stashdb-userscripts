(function () {
  "use strict";

  const {
    stashdb,
    StashDB,
    waitForElementId,
    waitForElementClass,
    waitForElementByXpath,
    getElementByXpath,
    sortElementChildren,
    createElementFromHTML,
  } = unsafeWindow.stashdb;

  GM_addStyle(`
    .EditImages-drop {
        position: relative !important;
        display: inline-block !important;
      }
      
    .EditImages-drop input {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        opacity: 0 !important;
        cursor: pointer !important;
        z-index: 1 !important;
      }
      
    .my-div {
        top: 0;
        left: 0;
        height: 180px;
    }
`);

const svg = '<svg fill="#ffffff" width="50px" height="50px" viewBox="-32 0 512 512" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M128 184c0-30.879 25.122-56 56-56h136V56c0-13.255-10.745-24-24-24h-80.61C204.306 12.89 183.637 0 160 0s-44.306 12.89-55.39 32H24C10.745 32 0 42.745 0 56v336c0 13.255 10.745 24 24 24h104V184zm32-144c13.255 0 24 10.745 24 24s-10.745 24-24 24-24-10.745-24-24 10.745-24 24-24zm184 248h104v200c0 13.255-10.745 24-24 24H184c-13.255 0-24-10.745-24-24V184c0-13.255 10.745-24 24-24h136v104c0 13.2 10.8 24 24 24zm104-38.059V256h-96v-96h6.059a24 24 0 0 1 16.97 7.029l65.941 65.941a24.002 24.002 0 0 1 7.03 16.971z"></path></g></svg>'
let initialised = false

function activeStatus(element) {
  if (!initialised) {
    initialised = true;
    element.textContent = 'Pasting Initalised...'
  } else {
    initialised = false;
    element.textContent = "Click to initialise pasting of images..."
  }
}
document.body.addEventListener("paste", (paste) => {
  if (paste.clipboardData.files.length == 0) return;
  if (initialised) {
    putFileIntoForm(paste.clipboardData.files);
  }
});
document.body.addEventListener("dragover", (over) =>
  over.preventDefault()
);
document.body.addEventListener("drop", async (drop) => {
  drop.preventDefault();
  const data = drop.dataTransfer;
  console.debug("type", ...data.types);
  let fileList;
  if (typeof GM != "undefined" && data.files.length == 0) {
    let urlList;
    if (~data.types.indexOf("text/html")) {
      const html = data.getData("text/html");
      const dom = parseHtml(html);
      urlList = dom.querySelectorAll("img");
      console.debug("query img url");
      if (urlList.length == 0) {
        console.debug("no image, query anchor");
        urlList = dom.querySelectorAll("a");
      }
      urlList = Array.from(urlList).map(
        (node) => node.src || node.href
      );
    }
    if (urlList.length == 0 && ~data.types.indexOf("text/plain")) {
      console.debug("no url found, try plain text");
      urlList = data
        .getData("text/plain")
        .split("\n")
        .filter((u) => u.charAt(0) != "#");
    }
    try {
      fileList = await Promise.all(urlList.map(fetchFile));
    } catch (e) {
      console.error(e);
      return;
    }
    fileList = createFileList(...fileList);
  } else fileList = drop.dataTransfer.files;
  console.debug("file list:", fileList);
  putFileIntoForm(fileList);
});

function createFileList(...fileList) {
  // attribute to https://stackoverflow.com/a/56447852/8362703
  const data = new DataTransfer();
  for (const file of fileList) data.items.add(file);
  return data.files;
}
function parseHtml(html) {
  const parser = new DOMParser();
  const dom = parser.parseFromString(html, "text/html");
  return dom;
}

async function fetchFile(url) {
  function xhrToFileType(xhr) {
    for (const row of xhr.responseHeaders.split(/\n/)) {
      // line-end with \r\n
      const scan = row.match(/^content-type: ([-_+\w]+)\/([-_+\w]+)/i);
      if (scan) {
        console.debug(row);
        return scan[2];
      }
    }
  }
  return await new Promise((resolve, reject) => {
    GM.xmlHttpRequest({
      method: "GET",
      url,
      responseType: "blob",
      onload(xhr) {
        const blob = xhr.response;
        const type = xhrToFileType(xhr);
        let file;
        if (type) {
          file = new File([blob], `drop-image.${type}`, {
            type: `image/${type}`,
          });
        } else file = new File([blob], `drop-image`);
        resolve(file);
      },
      onerror(xhr) {
        reject(xhr.statusText);
      },
    });
  });
}

function putFileIntoForm(fileList) {
  const input = document.querySelector('input[type = "file"]');
  if (!input) return;
  console.debug("fileList:", ...fileList);
  // attribute to https://stackoverflow.com/a/50427897/8362703
  input.files = fileList;
  const change = new Event("change", {
    bubbles: true,
    cancelable: false,
  });
  input.dispatchEvent(change);
}

  function buildElements(){
    waitForElementByXpath(
      '//div[contains(@class, "EditImages-drop")]',
      (xpath, el) => {

        const node = document.getElementsByClassName("EditImages-input");
        if (!document.getElementById("my-div")) {
          const container = document.createElement("div");
          container.classList.add("EditImages-input-container");
          const myDiv = document.createElement("div");
          container.appendChild(myDiv);
          myDiv.setAttribute("class", "my-div EditImages-drop");
          myDiv.setAttribute("id", "my-div");
          const cont2 = document.createElement("div");
          cont2.classList.add("EditImages-placeholder");
          cont2.innerHTML = svg;
          myDiv.appendChild(cont2);
          const span = document.createElement("span");
          span.textContent = "Click to initialise pasting of images...";
          cont2.appendChild(span);
          node[0].insertBefore(container, node[0].firstChild);

          container.addEventListener("click", function(e) {
            activeStatus(span);
          });
        }
      });
    }

  stashdb.addEventListener("stashdb:response", (evt) => {
    buildElements();
  });
})();
