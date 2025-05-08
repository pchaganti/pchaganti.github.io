document.addEventListener("DOMContentLoaded", () => {
  const hnItemsList = document.getElementById("hn-items-list");
  const hfItemsList = document.getElementById("hf-items-list");
  const lastUpdatedElement = document.getElementById("last-updated-time");
  const hfLastUpdatedElement = document.getElementById("hf-last-updated-time");
  const arxivLlmItemsList = document.getElementById("arxiv-llm-items-list");
  const arxivLlmLastUpdatedElement = document.getElementById(
    "arxiv-llm-last-updated-time",
  );
  const arxivAgentItemsList = document.getElementById("arxiv-agent-items-list");
  const arxivAgentLastUpdatedElement = document.getElementById(
    "arxiv-agent-last-updated-time",
  );
  const arxivCodeItemsList = document.getElementById("arxiv-code-items-list");
  const arxivCodeLastUpdatedElement = document.getElementById(
    "arxiv-code-last-updated-time",
  );

  const mitNewsItemsList = document.getElementById("mit-news-items-list");
  const mitNewsLastUpdatedElement = document.getElementById(
    "mit-news-last-updated-time",
  );

  // Function to calculate "time ago"
  function timeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp * 1000); // HN time is in seconds
    const secondsPast = (now.getTime() - past.getTime()) / 1000;

    if (secondsPast < 60) {
      return parseInt(secondsPast) + " seconds ago";
    }
    if (secondsPast < 3600) {
      return parseInt(secondsPast / 60) + " minutes ago";
    }
    if (secondsPast <= 86400) {
      return parseInt(secondsPast / 3600) + " hours ago";
    }
    if (secondsPast > 86400) {
      const days = parseInt(secondsPast / 86400);
      return days + (days === 1 ? " day" : " days") + " ago";
    }
  }

  // Function to format the "last_updated" ISO string
  function formatLastUpdated(isoString) {
    if (!isoString) return "N/A";
    try {
      const date = new Date(isoString);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Invalid date";
    }
  }

  // Function to format HuggingFace space data
  function createHuggingFaceItem(space) {
    const article = document.createElement("article");
    article.classList.add("trending-item");

    const titleLink = document.createElement("a");
    titleLink.href = space.url;
    titleLink.target = "_blank";
    titleLink.rel = "noopener noreferrer";
    titleLink.textContent = space.title;

    const titleHeader = document.createElement("h3");
    titleHeader.appendChild(titleLink);

    const metaDiv = document.createElement("div");
    metaDiv.classList.add("meta");

    const likesSpan = document.createElement("span");
    likesSpan.classList.add("score");
    likesSpan.textContent = `${space.likes} likes`;

    const timeSpan = document.createElement("span");
    timeSpan.classList.add("time");
    timeSpan.textContent = timeAgo(Date.parse(space.last_updated_space) / 1000); // Convert ISO string to Unix timestamp

    metaDiv.appendChild(likesSpan);
    metaDiv.appendChild(timeSpan);

    article.appendChild(titleHeader);
    article.appendChild(metaDiv);

    return article;
  }

  // Function to format Arxiv paper data
  function createArxivItem(paper) {
    const article = document.createElement("article");
    article.classList.add("trending-item");

    // Title and Toggle Button
    const titleHeader = document.createElement("h3");

    const toggleButton = document.createElement("span");
    toggleButton.classList.add("summary-toggle"); // Class for styling if needed
    toggleButton.textContent = "+"; // Plus for collapsed state
    toggleButton.style.cursor = "pointer";
    toggleButton.style.marginRight = "5px"; // Space between chevron and title
    toggleButton.setAttribute("aria-expanded", "false");
    toggleButton.setAttribute("aria-label", "Toggle summary");

    const titleLink = document.createElement("a");
    titleLink.href = paper.url;
    titleLink.target = "_blank";
    titleLink.rel = "noopener noreferrer";
    titleLink.textContent = paper.title;

    titleHeader.appendChild(toggleButton);
    titleHeader.appendChild(titleLink);

    // Summary (initially hidden)
    const summaryP = document.createElement("p");
    summaryP.classList.add("summary");
    summaryP.textContent = paper.summary;
    summaryP.style.display = "none"; // Initially hidden
    summaryP.style.marginTop = "5px"; // Add some space above the summary when visible

    // Meta information (time)
    const metaDiv = document.createElement("div");
    metaDiv.classList.add("meta");

    const timeSpan = document.createElement("span");
    timeSpan.classList.add("time");
    timeSpan.textContent = timeAgo(paper.published_time_eastern_timestamp);

    metaDiv.appendChild(timeSpan);

    // Event listener for the toggle button
    toggleButton.addEventListener("click", (event) => {
      event.stopPropagation(); // Prevent click from bubbling to other elements if any
      const isHidden = summaryP.style.display === "none";
      summaryP.style.display = isHidden ? "block" : "none";
      toggleButton.textContent = isHidden ? "-" : "+"; // Minus for expanded, Plus for collapsed
      toggleButton.setAttribute("aria-expanded", isHidden ? "true" : "false");
    });

    article.appendChild(titleHeader);
    article.appendChild(summaryP);
    article.appendChild(metaDiv);

    return article;
  }

  // Function to format MIT News story data
  function createMitNewsItem(story) {
    const article = document.createElement("article");
    article.classList.add("trending-item");

    const titleLink = document.createElement("a");
    titleLink.href = story.url;
    titleLink.target = "_blank";
    titleLink.rel = "noopener noreferrer";
    titleLink.textContent = story.title;

    const titleHeader = document.createElement("h3");
    titleHeader.appendChild(titleLink);

    const metaDiv = document.createElement("div");
    metaDiv.classList.add("meta");

    const timeSpan = document.createElement("span");
    timeSpan.classList.add("time");
    // The 'time' field in mit_news.json is already a Unix timestamp in seconds
    timeSpan.textContent = timeAgo(story.time);

    metaDiv.appendChild(timeSpan);

    article.appendChild(titleHeader);
    article.appendChild(metaDiv);

    return article;
  }

  // Function to fetch and display Arxiv data
  function fetchArxivData(
    jsonUrl,
    itemsListElement,
    lastUpdatedElement,
    sectionName,
  ) {
    fetch(jsonUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        itemsListElement.innerHTML = ""; // Clear loading message
        if (data.last_updated) {
          lastUpdatedElement.textContent = formatLastUpdated(data.last_updated);
        } else {
          lastUpdatedElement.textContent = "Last updated: N/A";
        }

        if (data.papers && data.papers.length > 0) {
          data.papers.forEach((paper) => {
            itemsListElement.appendChild(createArxivItem(paper));
          });
        } else {
          itemsListElement.innerHTML = "<p>No papers found.</p>";
        }
      })
      .catch((error) => {
        console.error(`Error fetching or parsing ${sectionName} data:`, error);
        itemsListElement.innerHTML = `<p style="color: red;">Error loading papers: ${error.message}. Check console for details.</p>`;
        lastUpdatedElement.textContent = "Last updated: Error";
      });
  }

  // Fetch HackerNews data
  fetch("https://pchaganti.github.io/misc/hackernews.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      // Clear loading message
      hnItemsList.innerHTML = "";
      lastUpdatedElement.textContent = formatLastUpdated(data.last_updated);

      if (data.stories && data.stories.length > 0) {
        data.stories.forEach((story) => {
          const article = document.createElement("article");
          article.classList.add("trending-item");

          const titleLink = document.createElement("a");
          titleLink.href = story.url;
          titleLink.target = "_blank";
          titleLink.rel = "noopener noreferrer";
          titleLink.textContent = story.title;

          const titleHeader = document.createElement("h3");
          titleHeader.appendChild(titleLink);

          const metaDiv = document.createElement("div");
          metaDiv.classList.add("meta");

          const scoreLink = document.createElement("a");
          scoreLink.href = story.comments_url;
          scoreLink.target = "_blank";
          scoreLink.rel = "noopener noreferrer";
          scoreLink.classList.add("score");
          scoreLink.textContent = `${story.score} points`;

          const timeSpan = document.createElement("span");
          timeSpan.classList.add("time");
          timeSpan.textContent = timeAgo(story.time);

          metaDiv.appendChild(scoreLink);
          metaDiv.appendChild(timeSpan);

          article.appendChild(titleHeader);
          article.appendChild(metaDiv);

          hnItemsList.appendChild(article);
        });
      } else {
        hnItemsList.innerHTML = "<p>No stories found.</p>";
      }
    })
    .catch((error) => {
      console.error("Error fetching or parsing Hacker News data:", error);
      hnItemsList.innerHTML = `<p style="color: red;">Error loading stories: ${error.message}. Check console for details.</p>`;
      lastUpdatedElement.textContent = "Last updated: Error";
    });

  // Fetch HuggingFace data
  fetch("https://pchaganti.github.io/misc/huggingface.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      hfItemsList.innerHTML = "";
      hfLastUpdatedElement.textContent = formatLastUpdated(data.last_updated);

      if (data.spaces && data.spaces.length > 0) {
        data.spaces.forEach((space) => {
          hfItemsList.appendChild(createHuggingFaceItem(space));
        });
      } else {
        hfItemsList.innerHTML = "<p>No spaces found.</p>";
      }
    })
    .catch((error) => {
      console.error("Error fetching or parsing HuggingFace data:", error);
      hfItemsList.innerHTML = `<p style="color: red;">Error loading spaces: ${error.message}. Check console for details.</p>`;
      hfLastUpdatedElement.textContent = "Last updated: Error";
    });

  // Fetch Arxiv LLM data
  fetchArxivData(
    "https://pchaganti.github.io/misc/arxiv_llm.json",
    arxivLlmItemsList,
    arxivLlmLastUpdatedElement,
    "Arxiv LLM",
  );

  // Fetch Arxiv Agent data
  fetchArxivData(
    "https://pchaganti.github.io/misc/arxiv_agent.json",
    arxivAgentItemsList,
    arxivAgentLastUpdatedElement,
    "Arxiv Agent",
  );

  // Fetch Arxiv Code data
  fetchArxivData(
    "https://pchaganti.github.io/misc/arxiv_code.json",
    arxivCodeItemsList,
    arxivCodeLastUpdatedElement,
    "Arxiv Code",
  );

  // Fetch MIT News data
  fetch("https://pchaganti.github.io/misc/mit_news.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      mitNewsItemsList.innerHTML = ""; // Clear loading message
      if (data.last_updated) {
        mitNewsLastUpdatedElement.textContent = formatLastUpdated(
          data.last_updated,
        );
      } else {
        mitNewsLastUpdatedElement.textContent = "Last updated: N/A";
      }

      if (data.stories && data.stories.length > 0) {
        data.stories.forEach((story) => {
          mitNewsItemsList.appendChild(createMitNewsItem(story));
        });
      } else {
        mitNewsItemsList.innerHTML = "<p>No stories found.</p>";
      }
    })
    .catch((error) => {
      console.error("Error fetching or parsing MIT News data:", error);
      mitNewsItemsList.innerHTML = `<p style="color: red;">Error loading stories: ${error.message}. Check console for details.</p>`;
      mitNewsLastUpdatedElement.textContent = "Last updated: Error";
    });
});
