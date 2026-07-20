export function createReadmeTemplate(
  title: string,
  difficulty: string,
  url: string,
  description: string,
): string {
  return `# ${title}

## Difficulty: ${difficulty}

## Link
[LeetCode Link](${url})

## Description
${description}
`;
}

export function createCommitMessage(title: string, difficulty: string): string {
  return `Add solution for ${title} (${difficulty})`;
}

export function formatFolderName(
  id: string | number,
  titleSlug: string,
): string {
  const paddedId = String(id).padStart(4, "0");
  return `${paddedId}-${titleSlug}`;
}

const LANGUAGE_TO_EXTENSION: Record<string, string> = {
  cpp: "cpp",
  java: "java",
  python: "py",
  python3: "py",
  c: "c",
  csharp: "cs",
  javascript: "js",
  typescript: "ts",
  php: "php",
  swift: "swift",
  kotlin: "kt",
  dart: "dart",
  golang: "go",
  ruby: "rb",
  scala: "scala",
  rust: "rs",
  racket: "rkt",
  erlang: "erl",
  elixir: "ex",
};

export function getLanguageExtension(langName: string): string {
  if (!langName || typeof langName !== "string") return "txt";
  return LANGUAGE_TO_EXTENSION[langName] || "txt";
}

const LEETCODE_SECTION_START = `<!---LeetCode Topics Start-->`;
const LEETCODE_SECTION_HEADER = `# LeetCode Topics`;
const LEETCODE_SECTION_END = `<!---LeetCode Topics End-->`;

/**
 * Appends a problem to the respective topic in the README markdown.
 */
export function appendProblemToReadme(
  topic: string,
  markdownFile: string,
  hook: string,
  problem: string
): string {
  // Use "main" or "master" branch depending on user's repo, but hardcoding master/main might be needed here or passed dynamically. 
  // For now we keep the original logic but typed.
  const url = `https://github.com/${hook}/tree/master/${problem}`;
  const topicHeader = `## ${topic}`;
  const topicTableHeader = `\n${topicHeader}\n|  |\n| ------- |\n`;
  const newRow = `| [${problem}](${url}) |`;

  // Check if the LeetCode Section exists, or add it
  let leetCodeSectionStartIndex = markdownFile.indexOf(LEETCODE_SECTION_START);
  if (leetCodeSectionStartIndex === -1) {
    markdownFile +=
      "\n" +
      [LEETCODE_SECTION_START, LEETCODE_SECTION_HEADER, LEETCODE_SECTION_END].join(
        "\n",
      );
    leetCodeSectionStartIndex = markdownFile.indexOf(LEETCODE_SECTION_START);
  }

  // Get LeetCode section and the Before & After sections
  const beforeSection = markdownFile.slice(
    0,
    markdownFile.indexOf(LEETCODE_SECTION_START),
  );
  const afterSection = markdownFile.slice(
    markdownFile.indexOf(LEETCODE_SECTION_END) + LEETCODE_SECTION_END.length,
  );

  let leetCodeSection = markdownFile.slice(
    markdownFile.indexOf(LEETCODE_SECTION_START) + LEETCODE_SECTION_START.length,
    markdownFile.indexOf(LEETCODE_SECTION_END),
  );

  // Check if topic table exists, or add it
  let topicTableIndex = leetCodeSection.indexOf(topicHeader);
  if (topicTableIndex === -1) {
    leetCodeSection += topicTableHeader;
    topicTableIndex = leetCodeSection.indexOf(topicHeader);
  }

  // Get the Topic table. If topic table was just added, then its end === LeetCode Section end
  const endTopicString = leetCodeSection
    .slice(topicTableIndex)
    .match(/\|\n[^|]/)?.[0];
  const endTopicIndex =
    endTopicString != null
      ? leetCodeSection.indexOf(endTopicString, topicTableIndex + 1)
      : -1;
  let topicTable =
    endTopicIndex === -1
      ? leetCodeSection.slice(topicTableIndex)
      : leetCodeSection.slice(topicTableIndex, endTopicIndex + 1);
  topicTable = topicTable.trim();

  // Check if the problem exists in topic table, prevent duplicate add
  const problemIndex = topicTable.indexOf(problem);
  if (problemIndex !== -1) {
    return markdownFile;
  }

  // Append problem to the Topic
  topicTable = [topicTable, newRow, "\n"].join("\n");

  // Replace the old Topic table with the updated one in the markdown file
  leetCodeSection =
    leetCodeSection.slice(0, topicTableIndex) +
    topicTable +
    (endTopicIndex === -1 ? "" : leetCodeSection.slice(endTopicIndex + 1));

  markdownFile = [
    beforeSection,
    LEETCODE_SECTION_START,
    leetCodeSection,
    LEETCODE_SECTION_END,
    afterSection,
  ].join("");

  return markdownFile;
}

/**
 * Sorts each Topic table by the problem number in the README markdown.
 */
export function sortTopicsInReadme(markdownFile: string): string {
  let beforeSection = markdownFile.slice(
    0,
    markdownFile.indexOf(LEETCODE_SECTION_START),
  );
  const afterSection = markdownFile.slice(
    markdownFile.indexOf(LEETCODE_SECTION_END) + LEETCODE_SECTION_END.length,
  );

  // Matches any text between the start and end tags. Should never fail to match.
  const leetCodeSectionMatch = markdownFile.match(
    new RegExp(`${LEETCODE_SECTION_START}([\\s\\S]*)${LEETCODE_SECTION_END}`),
  );
  
  if (!leetCodeSectionMatch || leetCodeSectionMatch[1] == null) {
    throw new Error("LeetCodeTopicSectionNotFound");
  }
  
  const leetCodeSection = leetCodeSectionMatch[1];

  // Remove the header
  let topics = leetCodeSection.trim().split("## ");
  topics.shift();

  // Get Array<sorted-topic>
  const sortedTopics = topics.map((section) => {
    let lines = section.trim().split("\n");

    // Get the problem topic
    const topic = lines.shift() || "";

    // Check if topic exists elsewhere
    let topicHeaderIndex = markdownFile.indexOf(`## ${topic}`);
    let leetCodeSectionStartIndex = markdownFile.indexOf(LEETCODE_SECTION_START);
    
    if (topicHeaderIndex !== -1 && topicHeaderIndex < leetCodeSectionStartIndex) {
      // matches the next '|\n' that doesn't precede a '|'. Typically this is '|\n#. Should always match if topic existed elsewhere.
      const endTopicString = markdownFile
        .slice(topicHeaderIndex)
        .match(/\|\n[^|]/)?.[0];
        
      if (endTopicString == null) {
        throw new Error("EndOfTopicNotFound");
      }

      // Get the old problems for merge
      const endTopicIndex = markdownFile.indexOf(
        endTopicString,
        topicHeaderIndex + 1,
      );
      const topicSection = markdownFile.slice(
        topicHeaderIndex,
        endTopicIndex + 1,
      );
      const problemsToMerge = topicSection.trim().split("\n").slice(3);

      // Merge previously solved problems and removes duplicates
      lines = lines.concat(problemsToMerge).reduce((array: string[], element: string) => {
        if (!array.includes(element)) {
          array.push(element);
        }
        return array;
      }, []);

      // Delete the old topic section after merging
      beforeSection =
        markdownFile.slice(0, topicHeaderIndex) +
        markdownFile.slice(
          endTopicIndex + 1,
          markdownFile.indexOf(LEETCODE_SECTION_START),
        );
    }

    // Remove the header and header separator
    lines = lines.slice(2);

    lines.sort((a, b) => {
      const matchA = a.match(/\/(\d+)-/);
      const matchB = b.match(/\/(\d+)-/);
      
      const numA = matchA ? parseInt(matchA[1], 10) : 0;
      const numB = matchB ? parseInt(matchB[1], 10) : 0;
      
      return numA - numB;
    });

    // Reconstruct the topic
    return ["## " + topic].concat("|  |", "| ------- |", lines).join("\n");
  });

  // Reconstruct the file
  return (
    beforeSection +
    [
      LEETCODE_SECTION_START,
      LEETCODE_SECTION_HEADER,
      ...sortedTopics,
      LEETCODE_SECTION_END,
    ].join("\n") +
    afterSection
  );
}
