const smallWords = new Set(["and", "or", "the", "of", "for", "to", "in", "on", "by", "with", "a", "an"]);

function capitalizeWord(word: string): string {
  if (!word) {
    return word;
  }

  const slashParts = word.split("/");

  if (slashParts.length > 1) {
    return slashParts.map(capitalizeWord).join("/");
  }

  const hyphenParts = word.split("-");

  if (hyphenParts.length > 1) {
    return hyphenParts.map(capitalizeWord).join("-");
  }

  return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
}

export function titleCase(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index, words) => {
      const lower = word.toLowerCase();

      if (index > 0 && index < words.length - 1 && smallWords.has(lower)) {
        return lower;
      }

      if (word === word.toUpperCase() && word.length <= 4) {
        return word;
      }

      return capitalizeWord(lower);
    })
    .join(" ");
}

export function statusLabel(value: string) {
  return titleCase(value);
}
