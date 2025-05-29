document.addEventListener("DOMContentLoaded", function () {
  // --- IMPORTANT: Define your reports here ---
  // Add each report as an object with 'topic' (display name)
  // and 'file' (path to the HTML file in the 'archive' folder).
  const reports = [
    {
      topic: "AI Practitioner",
      file: "archive/cert.html",
    },
    {
      topic: "Disrupting Cloud Management",
      file: "archive/products.html",
    },
    {
      topic: "Grip and the Forearm",
      file: "archive/grip.html",
    },
    {
      topic: "Ikebana: The Enduring Art of Arranging Life",
      file: "archive/ikebana.html",
    },
    {
      topic: "Intelligent Flows",
      file: "archive/agents.html",
    },
    {
      topic: "Pull-up Blueprint",
      file: "archive/pullups.html",
    },
    {
      topic: "QWEN3 with MLX",
      file: "archive/qwen.html",
    },
    {
      topic: "SC Usage Metrics",
      file: "archive/sc.html",
    },
    {
      topic: "Tokyo to Kyoto",
      file: "archive/kyoto.html",
    },
    {
      topic: "Wabi-Sabi: A Deep Exploration",
      file: "archive/wabisabi.html",
    },
  ];
  // --- End of reports definition ---

  const reportGridElement = document.getElementById("report-grid");
  const currentYearElement = document.getElementById("currentYear");

  if (currentYearElement) {
    currentYearElement.textContent = new Date().getFullYear();
  }

  if (!reportGridElement) {
    console.error("Error: The 'report-grid' element was not found in the DOM.");
    return;
  }

  if (reports.length === 0) {
    const noReportsMessage = document.createElement("p");
    noReportsMessage.textContent =
      "No reports are currently available. Please check back later.";
    noReportsMessage.className = "no-reports-message";
    reportGridElement.appendChild(noReportsMessage);
    return;
  }

  reports.forEach((report) => {
    const card = document.createElement("div");
    card.className = "report-card";
    card.setAttribute("data-link", report.file);
    card.setAttribute("title", `Open report: ${report.topic}`);
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");

    const topicTitle = document.createElement("h3");
    topicTitle.textContent = report.topic;

    card.appendChild(topicTitle);

    card.addEventListener("click", function () {
      const reportLink = this.getAttribute("data-link");
      if (reportLink) {
        window.open(reportLink, "_blank");
      }
    });

    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        this.click();
      }
    });

    reportGridElement.appendChild(card);
  });
});
