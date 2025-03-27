async function loadHaikus() {
  try {
    const response = await fetch("../misc/haikus.txt");
    const text = await response.text();
    const haikus = parseHaikus(text);
    displayHaikus(haikus);
  } catch (error) {
    console.error("Error loading haikus:", error);
  }
}

function parseHaikus(text) {
  return text
    .split("---")
    .map((block) => block.trim())
    .filter((block) => block)
    .map((block) => {
      const lines = block.split("\n").filter((line) => line.trim());
      return {
        date: lines[0],
        text: lines.slice(1).join("\n"),
      };
    });
}

function displayHaikus(haikus) {
  const container = document.getElementById("haiku-container");
  haikus.forEach((haiku) => {
    // Remove the comma and the number after it from the date
    const formattedDate = haiku.date.replace(/,\s*\d+$/, "");
    const haikuDiv = document.createElement("div");
    haikuDiv.className = "haiku gidole-regular";
    haikuDiv.innerHTML = `
            <div class="haiku-date">${formattedDate}</div>
            <div class="haiku-text">${haiku.text}</div>
        `;
    container.appendChild(haikuDiv);
  });
}

document.addEventListener("DOMContentLoaded", loadHaikus);
