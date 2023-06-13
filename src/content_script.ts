let instanceUrl = "";

const lemmyCommunityRegex = new RegExp(
  `![a-zA-Z\\_\\-]{1,30}@([a-zA-Z0-9\\-ßàÁâãóôþüúðæåïçèõöÿýòäœêëìíøùîûñé]{1,63}\\.){1,127}[a-zA-Z]{2,63}`,
  "gm"
);
const looselemmyCommunityRegex = new RegExp(
  `[a-zA-Z\\_\\-]{1,30}@([a-zA-Z0-9\\-ßàÁâãóôþüúðæåïçèõöÿýòäœêëìíøùîûñé]{1,63}\\.){1,127}[a-zA-Z]{2,63}`,
  "gm"
);
const lemmyCommunityUrlRegex = new RegExp(
  `https?:\\/\\/(?:[a-zA-Z0-9\\-]{1,63}\\.){1,127}[a-zA-Z]{2,63}\\/c\\/[a-zA-Z]{1,30}`,
  "gm"
);

//
const observer = new MutationObserver((mutationList, observer) => {
  for (let mutation of mutationList) {
    if (mutation.target.parentElement !== null) {
      walk(mutation.target.parentElement);
    }
  }
});
const observerConfig = { attributes: false, childList: true, subtree: true };

function walk(node: Node) {
  // I stole this function from here:
  // https://github.com/panicsteve/cloud-to-butt/blob/master/Source/content_script.js

  var child, next;
  if (node instanceof HTMLElement) {
    var tagName = node.tagName ? node.tagName.toLowerCase() : "";
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
  if (
    isTextNodeWithCommunity(textNode, lemmyCommunityRegex) ||
    (isTextNodeWithCommunity(textNode, looselemmyCommunityRegex) &&
      isParentTextNodeWithCommunity(textNode, lemmyCommunityRegex))
  ) {
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
    const newText = `${linkElement}&nbsp;${match}`;
    newHTML = newHTML.replace(regex, () => newText);
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
      const replacement = input.includes(instanceUrl)
        ? input.replace(`@${instanceUrl}`, "")
        : input.replace("!", "");
      resultUrl = `${baseUrl}m/${replacement}`;
      break;
    case "url":
      resultUrl = input.replace(
        /https?:\/\/([^/]+)\/c\/(.+)/,
        `https://${instanceUrl}/m/$2@$1`
      );
      break;
  }
  const linkElement = `<a href="${resultUrl}">
  <img style="height: 0.9em;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAKLUExURQAAALtZ9L5b78dm5MFf7MBX+LpV+bVS+rZS+LdS+c5u2rdV9cJg6sNj6MZm5cpp4s9x2slo49J219R50p1F/NqBzNB+05lE/N2Fyf8A/5RC/OCJxY8//eeUuueOw6hD/Ik9/OiTvOSLw71b8rpW9LhU9rVQ+rVQ+r5b771a8bZR+bVQ+sFg68Be7blV9rdT98tn38Vk57xZ8bpY88FX+L9W+L1V+bpU+blT+cxt3shp479e7b5W+LRR+a5N/MBh6ctt38Rk6MNj6blT+a9P+qxN+r5h6cdo48Zm5bRR+bJQ+stt38hi6K9P+q1O+s9z2s5x26pN+qhM+tN31dJ216hN/KNJ+9Z70dR5055H+9qAzZlE/JdE/N6Gx92EyZVC/JJB/eKKw+CJxZA//Yw+/uWPv4Y7/7Bi4OqWuOmUuuiTvLdT97ZR+bVQ+rtY8rpX9LlV9bhT97ZS+L9d7r1b8Lxa8btY87pW9MNj6MJh6sFg68Be7b5c7sdn5MVm5sRk58Ni6cFf7LxV+blT+bdS+cps4Mlq4sho48Zn5cVl5rRR+bJQ+s9y2s1w3Mxu3ctt38pr4K9P+q1O+qpM+qpO+chs3tN31tF12NBz2c5x28xu3qtN+qhL+6VK+65T89J41NZ70tR51NN31dJ219F02KZK+6NJ+6BH/Lhg59qBzNl/zth9z9Z80dV60qFI+55H+51H+8hx2d6Gx9yDytuCy9qAzdd90JxG/JlE/KFN9diByuGKxOCIxt2FyduBzJNB/a5b6OSOwOOMweKLw+GJxN+HxpBA/cNx1uqVueiSvOaRveWPv+OMwpVH9tuJwu2ZteuXuOmUu+eSvOaQvu6csvCdsu6btOyYt////5LEvacAAABrdFJOUwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4P3+4cl3/17XPzpOgGbvw9cjpJ+GRXSg8+VRXT19UWn/ff60hhv/JoBPuz7WxnQ4SYEp7AHd3FI9u02IuDEDwm1g239/tIus/OF0wAAAAFiS0dE2AANR64AAAAHdElNRQfnBgoDJCWfwh/mAAAAAW9yTlQBz6J3mgAAALVJREFUGNNNyKFOQ0EQRuE5O//u3KFBlMALEIKtwOG5lbwcHoXiBVpBQKEICcFThQVTmmJIRVdw3PkwMzPjFEawJepQuQJQB0fUDhWAc+YAW6EZwHtSgd/DfNMwwvICBiAXgaI0AkaATQO15znXALA+Fkgc0Jvc16fyH9aifElk/58TgZVHz8zM/Bty8Ae34uUuIlqbxtGt3E0uAoDNRPinqexhm4EWbubT1dnrpWRx8+If/m07tcceicDkwY8AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjMtMDYtMTBUMDM6MzY6MzMrMDA6MDC5z2wUAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIzLTA2LTEwVDAzOjM2OjMzKzAwOjAwyJLUqAAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyMy0wNi0xMFQwMzozNjozNyswMDowMGvI0WQAAAAASUVORK5CYII=" alt="${input}">
</a>`;
  return linkElement;
}

// @ts-ignore
function restore_options(): void {
  chrome.storage.sync.get(
    {
      instance: "kbin.social",
    },
    function (items) {
      instanceUrl = items.instance;
      // Don't run on own server
      if (!location.href.startsWith(`${location.protocol}//${instanceUrl}`)) {
        walk(document.body);
        observer.observe(document.body, observerConfig);
      }
    }
  );
}

restore_options();
