let instanceUrl = "";
let serviceType = "";

const lemmyCommunityRegex = new RegExp(
  `![a-zA-Z0-9\\_\\-]{1,30}@([a-zA-Z0-9\\-ßàÁâãóôþüúðæåïçèõöÿýòäœêëìíøùîûñé]{1,63}\\.){1,127}[a-zA-Z]{2,63}`,
  "gm"
);
const lemmyCommunityUrlRegex = new RegExp(
  `https?:\\/\\/(?:[a-zA-Z0-9\\-]{1,63}\\.){1,127}[a-zA-Z]{2,63}\\/c\\/[a-zA-Z]{1,30}`,
  "gm"
);

const queue: MutationRecord[][] = [];
const observer = new MutationObserver((mutations) => {
  if (!queue.length) {
    requestIdleCallback(executeProcess);
  }
  queue.push(mutations);
});

function executeProcess() {
  while (queue.length > 0) {
    const mutationList = queue.shift();
    if (mutationList) {
      for (let mutation of mutationList) {
        if (mutation.target.parentElement) {
          walk(mutation.target.parentElement);
        }
      }
    }
  }
}

const observerConfig = { attributes: false, childList: true, subtree: true };

function walk(node: HTMLElement | ChildNode) {
  // I stole this function from here:
  // https://github.com/panicsteve/cloud-to-butt/blob/master/Source/content_script.js

  let child, next;
  if (node instanceof HTMLElement) {
    if (node.matches("header") || node.matches("footer")) {
      return;
    }
    let tagName = node.tagName ? node.tagName.toLowerCase() : "";
    if (tagName == "input" || tagName == "textarea") {
      return;
    }
    if (node.classList && node.classList.contains("kbin_linker")) {
      return;
    }
  }
  switch (node.nodeType) {
    case Node.ELEMENT_NODE: // Element
    case Node.DOCUMENT_NODE: // Document
    case Node.DOCUMENT_FRAGMENT_NODE: // Document fragment
      child = node.firstChild;
      while (child) {
        next = child.nextSibling;
        walk(child);
        child = next;
      }
      break;
    case Node.TEXT_NODE: // Text node
      handleText(node);
      break;
  }
}

function handleText(textNode: Node) {
  if (isTextNodeWithCommunity(textNode, lemmyCommunityRegex)) {
    processTextNode(textNode, lemmyCommunityRegex, "mention");
  } else if (isTextNodeWithCommunity(textNode, lemmyCommunityUrlRegex)) {
    processTextNode(textNode, lemmyCommunityUrlRegex, "url");
  }
}

function isTextNodeWithCommunity(textNode: Node, regex: RegExp) {
  return textNode.nodeValue?.match(regex);
}

function isParentTextNodeWithCommunity(textNode: Node, regex: RegExp) {
  return textNode.parentElement?.innerText.match(regex);
}

function processTextNode(
  textNode: Node,
  regex: RegExp,
  type: "mention" | "url"
) {
  const parentElement = textNode.parentElement;
  if (!parentElement) {
    return;
  }

  parentElement.classList.add("kbin_linker");
  const matches = parentElement.innerHTML.match(regex) || [];

  let newHTML = parentElement.innerHTML;
  for (let match of matches) {
    const linkElement = convertToKbinUrl(match, type);
    newHTML = newHTML.replace(regex, () => linkElement);
  }
  parentElement.innerHTML = newHTML;
}

//mention !community@instance.domain
//url https://lemmy.ml/c/memes
function convertToKbinUrl(input: string, type: "mention" | "url") {
  const baseUrl = `https://${instanceUrl}/`;
  let resultUrl = "";
  switch (type) {
    case "mention":
      const strippedInput = input.replace("!", "");
      const replacement = strippedInput.includes(instanceUrl)
        ? strippedInput.replace(`@${instanceUrl}`, "")
        : strippedInput;
      resultUrl = `${baseUrl}${serviceType}/${replacement}`;
      break;
    case "url":
      resultUrl = input.replace(
        /https?:\/\/([^/]+)\/c\/(.+)/,
        `https://${instanceUrl}/${serviceType}/$2@$1`
      );
      break;
  }
  const linkElement = `<a href="${resultUrl}" title=${input} id="icon-link"></a>&nbsp;${input}
`;
  return linkElement;
}

// @ts-ignore
function restore_options(): void {
  chrome.storage.sync.get(
    {
      instance: "kbin.social",
      serviceType: "m",
    },
    function (items) {
      instanceUrl = items.instance;
      serviceType = items.serviceType;
      walk(document.body);
      observer.observe(document.body, observerConfig);
    }
  );
}

restore_options();
