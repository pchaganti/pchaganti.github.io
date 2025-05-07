document.addEventListener("DOMContentLoaded", () => {
  const hnItemsList = document.getElementById("hn-items-list");
  const hfItemsList = document.getElementById("hf-items-list");
  const lastUpdatedElement = document.getElementById("last-updated-time");
  const hfLastUpdatedElement = document.getElementById("hf-last-updated-time");

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
});
