// Theme toggle functionality
const themeToggle = document.querySelector(".theme-toggle");
const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

// Check for saved theme preference, otherwise use system preference
const currentTheme = localStorage.getItem("theme");
if (currentTheme === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
  updateThemeIcon(true);
} else if (currentTheme === "light") {
  document.documentElement.setAttribute("data-theme", "light");
  updateThemeIcon(false);
} else {
  // Use system preference if no saved preference
  if (prefersDarkScheme.matches) {
    document.documentElement.setAttribute("data-theme", "dark");
    updateThemeIcon(true);
  }
}

// Function to toggle theme (extracted to be reusable)
function toggleTheme() {
  let theme;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (
    !document.documentElement.hasAttribute("data-theme") ||
    document.documentElement.getAttribute("data-theme") === "light"
  ) {
    document.documentElement.setAttribute("data-theme", "dark");
    theme = "dark";
    // Force Safari to repaint by applying styles directly to body
    document.body.style.backgroundColor = "#121212";
    document.body.style.background = "#121212";

    if (isSafari) {
      // Additional Safari-specific fixes
      document.documentElement.style.backgroundColor = "#121212";
      document.body.classList.remove("light-theme");
      document.body.classList.add("dark-theme");
    }
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    theme = "light";
    // Force Safari to repaint by applying styles directly to body
    document.body.style.backgroundColor = "#eeeeee";
    document.body.style.background = "#eeeeee";

    if (isSafari) {
      // Additional Safari-specific fixes
      document.documentElement.style.backgroundColor = "#eeeeee";
      document.body.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
    }
  }
  localStorage.setItem("theme", theme);
  updateThemeIcon(theme === "dark");

  // Force a repaint in Safari with multiple techniques
  document.body.offsetHeight;

  if (isSafari) {
    // More aggressive repaint techniques for Safari
    setTimeout(() => {
      window.getComputedStyle(document.body).backgroundColor;
      document.body.style.display = "none";
      document.body.offsetHeight; // Trigger reflow
      document.body.style.display = "";
    }, 0);
  }
}

// Handle theme toggle events (click for desktop, touch for mobile)
themeToggle.addEventListener("click", function (e) {
  toggleTheme();
  e.preventDefault(); // Prevent default behavior
});

// Add touch events for iOS devices
themeToggle.addEventListener(
  "touchstart",
  function (e) {
    e.preventDefault(); // Prevent default behavior
  },
  { passive: false }
);

themeToggle.addEventListener(
  "touchend",
  function (e) {
    toggleTheme();
    e.preventDefault(); // Prevent default behavior
    e.stopPropagation(); // Stop event propagation
  },
  { passive: false }
);

// Update the theme toggle icon
function updateThemeIcon(isDark) {
  const icon = themeToggle.querySelector(".sun-and-moon");
  icon.style.transform = isDark ? "rotate(360deg)" : "rotate(0deg)";
}

// Listen for system theme changes
prefersDarkScheme.addEventListener("change", function (e) {
  if (!localStorage.getItem("theme")) {
    // Only update if user hasn't manually set a preference
    if (e.matches) {
      document.documentElement.setAttribute("data-theme", "dark");
      updateThemeIcon(true);
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      updateThemeIcon(false);
    }
  }
});

// Audio context variables
let audioContext;
let ambientSound;
let handpanSounds = [];
let windChimeSounds = [];
let pianoSounds = [];
let harpSounds = []; // Added harp sounds array
let backgroundParticles = [];
let audioInitialized = false;
let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
let audioUnlocked = false; // Track if audio has been unlocked on iOS

// Add iOS class to body if on iOS device
if (isIOS) {
  document.body.classList.add("ios-device");
}

// Desktop audio banner functionality
const desktopAudioBanner = document.querySelector(".desktop-audio-banner");

function showAudioBanner() {
  // Only show banner if audio context is suspended or not initialized
  // AND we're not on iOS (iOS has its own notification)
  if (
    (!audioContext || (audioContext && audioContext.state === "suspended")) &&
    !isIOS
  ) {
    desktopAudioBanner.classList.add("show");

    // Add click handler to entire document
    const dismissBanner = (event) => {
      // Prevent default to avoid any potential issues
      if (event) {
        event.preventDefault();
      }

      if (!audioContext) {
        tryInitAudio();
      } else if (audioContext.state === "suspended") {
        audioContext
          .resume()
          .then(() => {
            console.log("AudioContext resumed successfully");
            // Start audio elements after resume if needed
            if (!ambientSound && audioInitialized) {
              createAmbientSound();
            }
          })
          .catch((err) => {
            console.error("Failed to resume AudioContext:", err);
          });
      }

      // Always hide the banner regardless of audio context state
      desktopAudioBanner.classList.remove("show");

      // Remove all event listeners to ensure it works on iOS
      ["click", "touchstart", "touchend", "mousedown", "pointerdown"].forEach(
        (eventType) => {
          document.removeEventListener(eventType, dismissBanner);
        }
      );

      // For iOS, mark audio as unlocked to prevent future issues
      if (isIOS) {
        audioUnlocked = true;
      }
    };

    // Add multiple event listeners for iOS compatibility
    ["click", "touchstart", "touchend", "mousedown", "pointerdown"].forEach(
      (eventType) => {
        document.addEventListener(eventType, dismissBanner, {
          passive: false,
        });
      }
    );
  }
}

// Show banner initially if needed
showAudioBanner();

// Initialize audio context on page load with fallback to user interaction
function tryInitAudio() {
  try {
    // Create audio context first
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // For iOS, we need to defer actual audio initialization until user interaction
    if (isIOS) {
      // Don't try to play audio immediately on iOS - it won't work
      // Instead, show the notification and wait for user interaction
      showIOSAudioNotification();
      return false;
    } else {
      // For non-iOS, try the normal approach
      // Create a silent audio buffer to unlock audio context
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);

      // Start our actual audio
      initAudio();
      return true;
    }
  } catch (e) {
    // Show notification if autoplay is blocked
    showIOSAudioNotification();
    return false;
  }
}

// Separate function to show audio notification
function showIOSAudioNotification() {
  const notification = document.createElement("div");
  notification.className = "audio-notification";
  notification.textContent = isIOS
    ? "Tap anywhere to activate the orfeo audio experience on your iOS device"
    : "Click anywhere to activate the orfeo audio experience";
  document.body.appendChild(notification);

  // Show notification after short delay
  setTimeout(() => {
    notification.classList.add("show");
  }, 1000);

  // Add multiple interaction listeners for iOS and other mobile devices
  // We'll use both touchstart and click for maximum compatibility
  const interactionEvents = [
    "touchstart",
    "touchend",
    "click",
    "mousedown",
    "pointerdown",
    "keydown", // Add keyboard support for accessibility
  ];

  function userInteractionHandler(event) {
    // Remove all event listeners first to prevent multiple triggers
    interactionEvents.forEach((eventType) => {
      document.body.removeEventListener(eventType, userInteractionHandler);
    });

    // Hide notification
    const notifications = document.querySelectorAll(".audio-notification");
    notifications.forEach((notification) => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });

    // Also hide desktop audio banner if it's visible
    if (desktopAudioBanner) {
      desktopAudioBanner.classList.remove("show");
    }

    // Initialize audio
    initAudio();

    // Prevent default behavior to avoid any potential issues
    if (event) {
      event.preventDefault();
    }
  }

  // Register all interaction events with passive:false for better compatibility
  interactionEvents.forEach((eventType) => {
    document.body.addEventListener(eventType, userInteractionHandler, {
      once: true,
      passive: false,
    });
  });

  return false;
}

// Try to initialize audio immediately
tryInitAudio();
window.addEventListener("resize", updateBackgroundParticles);

// Initialize handpan sounds
function initHandpanSounds() {
  // Create multiple handpan notes with different frequencies
  const notes = [220, 277.18, 329.63, 440, 523.25]; // A3, C#4, E4, A4, C5

  notes.forEach((freq, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = freq;
    gainNode.gain.value = 0;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    handpanSounds.push({
      oscillator,
      gainNode,
      freq,
      lastPlayed: 0,
    });
  });
}

// Initialize wind chime sounds
function initWindChimes() {
  // Create wind chime notes with pentatonic scale frequencies
  const chimeNotes = [523.25, 587.33, 659.25, 783.99, 880.0]; // C5, D5, E5, G5, A5

  chimeNotes.forEach((freq, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = freq;
    gainNode.gain.value = 0;

    // Add slight detuning for more natural sound
    oscillator.detune.value = Math.random() * 10 - 5;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    windChimeSounds.push({
      oscillator,
      gainNode,
      freq,
      lastPlayed: 0,
    });
  });
}

// Initialize piano sounds
function initPianoSounds() {
  // Create piano notes with lower frequencies for softer sound
  const pianoNotes = [130.81, 174.61, 220.0, 261.63, 329.63]; // C3, F3, A3, C4, E4

  pianoNotes.forEach((freq, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "triangle"; // Softer than sine wave
    oscillator.frequency.value = freq;
    gainNode.gain.value = 0;

    // Add slight detuning for more natural sound
    oscillator.detune.value = Math.random() * 5 - 2.5;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    pianoSounds.push({
      oscillator,
      gainNode,
      freq,
      lastPlayed: 0,
    });
  });
}

// Initialize harp sounds
function initHarpSounds() {
  // Create harp notes using a pentatonic scale for ethereal sound
  const harpNotes = [
    392.0, // G4
    440.0, // A4
    493.88, // B4
    587.33, // D5
    659.25, // E5
  ];

  harpNotes.forEach((freq, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    oscillator.type = "triangle"; // Triangle wave for harp-like timbre
    oscillator.frequency.value = freq;
    gainNode.gain.value = 0;

    // Configure filter for harp-like sound
    filter.type = "lowpass";
    filter.frequency.value = 2000;
    filter.Q.value = 0.7;

    // Add slight detuning for more natural sound
    oscillator.detune.value = Math.random() * 5 - 2.5;

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    harpSounds.push({
      oscillator,
      gainNode,
      filter,
      freq,
      lastPlayed: 0,
    });
  });
}

// Play random piano note
function playPianoNote() {
  if (!pianoSounds.length) return;

  const now = audioContext.currentTime;
  const minDelay = 5; // Minimum seconds between notes

  // Filter sounds that haven't played recently
  const availableSounds = pianoSounds.filter(
    (sound) => now - sound.lastPlayed > minDelay
  );

  if (availableSounds.length) {
    const sound =
      availableSounds[Math.floor(Math.random() * availableSounds.length)];

    sound.gainNode.gain.cancelScheduledValues(now);
    sound.gainNode.gain.setValueAtTime(0, now);
    // Gentle attack and decay for soft piano effect
    sound.gainNode.gain.linearRampToValueAtTime(0.05, now + 1.5);
    sound.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 4);

    sound.lastPlayed = now;
  }
}

// Play random wind chime note
function playWindChime() {
  if (!windChimeSounds.length) return;

  const now = audioContext.currentTime;
  const minDelay = 3; // Minimum seconds between chimes

  // Filter sounds that haven't played recently
  const availableChimes = windChimeSounds.filter(
    (chime) => now - chime.lastPlayed > minDelay
  );

  if (availableChimes.length) {
    const chime =
      availableChimes[Math.floor(Math.random() * availableChimes.length)];

    chime.gainNode.gain.cancelScheduledValues(now);
    chime.gainNode.gain.setValueAtTime(0, now);
    // Longer attack and decay for wind chime effect
    chime.gainNode.gain.linearRampToValueAtTime(0.08, now + 0.5);
    chime.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 4);

    chime.lastPlayed = now;
  }
}

// Play random handpan note
function playHandpanNote() {
  if (!handpanSounds.length) return;

  const now = audioContext.currentTime;
  const minDelay = 1.5; // Minimum seconds between notes

  // Filter sounds that haven't played recently
  const availableSounds = handpanSounds.filter(
    (sound) => now - sound.lastPlayed > minDelay
  );

  if (availableSounds.length) {
    const sound =
      availableSounds[Math.floor(Math.random() * availableSounds.length)];

    sound.gainNode.gain.cancelScheduledValues(now);
    sound.gainNode.gain.setValueAtTime(0, now);
    sound.gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01);
    sound.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2);

    sound.lastPlayed = now;
  }
}

// Play random harp note
function playHarpNote() {
  if (!harpSounds.length) return;

  const now = audioContext.currentTime;
  const minDelay = 2; // Minimum seconds between notes

  // Filter sounds that haven't played recently
  const availableSounds = harpSounds.filter(
    (sound) => now - sound.lastPlayed > minDelay
  );

  if (availableSounds.length) {
    const sound =
      availableSounds[Math.floor(Math.random() * availableSounds.length)];

    sound.gainNode.gain.cancelScheduledValues(now);
    sound.gainNode.gain.setValueAtTime(0, now);

    // Quick attack for pluck-like sound
    sound.gainNode.gain.linearRampToValueAtTime(0.08, now + 0.02);
    // Fast initial decay for pluck characteristic
    sound.gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    // Longer final decay for natural sustain
    sound.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    // Subtle filter sweep for organic quality
    sound.filter.frequency.setValueAtTime(3000, now);
    sound.filter.frequency.exponentialRampToValueAtTime(500, now + 0.5);

    sound.lastPlayed = now;
  }
}

// Play handpan notes periodically
setInterval(playHandpanNote, 2000);

// Play wind chimes periodically with longer interval
setInterval(playWindChime, 4000);

// Play piano notes periodically with the longest interval for subtle effect
setInterval(playPianoNote, 8000);

// Add harp plucks to the periodic sound effects
setInterval(playHarpNote, 3000); // Play harp notes every 3 seconds

// Show mobile recommendation banner
if (window.innerWidth < 768) {
  const mobileNotification = document.createElement("div");
  mobileNotification.className = "mobile-notification";
  mobileNotification.textContent =
    "For best experience, try this app on a tablet or larger device with better display and audio";
  document.body.appendChild(mobileNotification);

  setTimeout(() => {
    mobileNotification.classList.add("show");

    // Auto-hide after 8 seconds
    setTimeout(() => {
      mobileNotification.classList.remove("show");
      setTimeout(() => {
        if (mobileNotification.parentNode) {
          mobileNotification.parentNode.removeChild(mobileNotification);
        }
      }, 300);
    }, 8000);
  }, 1000);
}

function initAudio() {
  // Prevent multiple initializations
  if (audioInitialized) return;
  audioInitialized = true;

  // If audioContext wasn't created yet, create it now
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Initialize handpan sounds
  initHandpanSounds();

  // Initialize wind chime sounds
  initWindChimes();

  // Initialize piano sounds
  initPianoSounds();

  // Initialize harp sounds
  initHarpSounds();

  // Special iOS audio unlocking sequence
  function unlockAudioForIOS() {
    if (audioUnlocked) return;

    // iOS requires multiple techniques to reliably unlock audio
    // 1. Create and play a silent buffer
    const silentBuffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = silentBuffer;
    source.connect(audioContext.destination);
    source.start(0);

    // 2. Create and play a short oscillator
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.001; // Nearly silent
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(0);
    oscillator.stop(0.001); // Very short duration

    // Mark audio as unlocked
    audioUnlocked = true;
    console.log("iOS audio unlock sequence completed");
  }

  // Enhanced audio context handling for all devices
  function resumeAudioContext(event) {
    // For iOS, run the special unlock sequence first
    if (isIOS) {
      unlockAudioForIOS();
    }

    if (audioContext.state === "suspended") {
      audioContext
        .resume()
        .then(() => {
          console.log("AudioContext resumed successfully");
          // Start audio elements after resume
          if (!ambientSound) {
            createAmbientSound();
          }
          createRandomCircle();

          // Show success notification
          showAudioNotification(
            isIOS
              ? "Audio activated on your iOS device"
              : "Audio activated successfully"
          );
        })
        .catch((err) => {
          console.error("AudioContext resume failed:", err);
          // Show error notification with iOS-specific message if needed
          showAudioNotification(
            isIOS
              ? "Audio couldn't be started. Please try tapping again."
              : "Audio couldn't be started. Please try again."
          );
        });
    } else {
      // If context is already running but we haven't created ambient sound yet
      if (!ambientSound) {
        createAmbientSound();
      }
    }

    // Prevent default to avoid any potential issues
    if (event) {
      event.preventDefault();
    }
  }

  // Add multiple interaction listeners for maximum compatibility
  // These are especially important for iOS
  const interactionEvents = ["touchstart", "touchend", "click", "mousedown"];
  interactionEvents.forEach((eventType) => {
    document.body.addEventListener(eventType, resumeAudioContext, {
      passive: false,
    });
  });

  // Start creating circles after audio is initialized
  createRandomCircle(); // Create first circle immediately
  setInterval(createRandomCircle, 800); // Create circles more frequently

  // Create background particles
  createBackgroundParticles();

  // Start ambient background sound
  createAmbientSound();

  // Trigger special effects periodically
  // setInterval(() => {
  //   // Random chance to play special effect (about 15% chance every 5 seconds)
  //   if (Math.random() < 0.15) {
  //     playSpecialEffect();
  //   }
  // }, 5000);

  // Add click event listener to create interactive effects
  document.body.addEventListener("click", (event) => {
    // Create a circle at the click position
    const size = 100 + Math.random() * 100;
    const x = event.clientX - size / 2;
    const y = event.clientY - size / 2;

    // Use a special color for interactive circles
    const hue = 30 + Math.random() * 30; // Gold range
    const color = `hsl(${hue}, 90%, 60%)`;

    // Create ripple at click position
    createRippleEffect(event.clientX, event.clientY, size * 1.5, color);

    // Create particle burst
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        createParticleTrail(event.clientX, event.clientY, size, color);
      }, i * 50);
    }

    // Play a special sound for interaction
    // playSpecialEffect();
  });
}

// Create background particles for ambient effect
function createBackgroundParticles() {
  // Reduced particle count for mobile devices
  const isMobile = window.innerWidth <= 768;
  const particleCount = isMobile
    ? Math.floor((window.innerWidth * window.innerHeight) / 50000)
    : Math.floor((window.innerWidth * window.innerHeight) / 15000);

  for (let i = 0; i < particleCount; i++) {
    createBackgroundParticle();
  }

  // Animate background particles
  animateBackgroundParticles();
}

function createBackgroundParticle() {
  // Detect if we're on iPad/iOS
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isMobile = window.innerWidth <= 768;

  // Even smaller particles for iPad to prevent blob appearance
  const size = isIOS
    ? 1 + Math.random() * 2 // Tiny particles on iPad
    : isMobile
    ? 1 + Math.random() * 3 // Small particles on other mobile
    : 2 + Math.random() * 8; // Regular size for desktop

  const x = Math.random() * window.innerWidth;
  const y = Math.random() * window.innerHeight;

  const particle = document.createElement("div");
  particle.className = "bg-particle";
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particle.style.left = `${x}px`;
  particle.style.top = `${y}px`;

  // Reduced movement range for iPad/mobile
  const moveRange = isIOS ? 15 : isMobile ? 25 : 40;
  const xFloat = Math.random() * moveRange - moveRange / 2;
  const yFloat = Math.random() * moveRange - moveRange / 2;
  const rotation = Math.random() * 360;

  // Shorter animation duration for iPad
  const duration = isIOS ? 15 + Math.random() * 15 : 15 + Math.random() * 30;

  particle.style.setProperty("--x-float", `${xFloat}px`);
  particle.style.setProperty("--y-float", `${-Math.abs(yFloat)}px`); // Always float up first
  particle.style.setProperty("--x-float2", `${-xFloat * 0.7}px`);
  particle.style.setProperty("--y-float2", `${-yFloat * 0.5}px`);
  particle.style.setProperty("--x-float3", `${xFloat * 0.3}px`);
  particle.style.setProperty("--y-float3", `${Math.abs(yFloat)}px`); // Then float down
  particle.style.setProperty("--rotation", `${rotation}deg`);
  particle.style.setProperty("--rotation2", `${rotation * 2}deg`);
  particle.style.setProperty("--rotation3", `${rotation * 3}deg`);

  // Apply hardware acceleration for smoother rendering
  particle.style.transform = "translateZ(0)";
  particle.style.webkitTransform = "translateZ(0)";
  particle.style.backfaceVisibility = "hidden";
  particle.style.webkitBackfaceVisibility = "hidden";

  // Adjust opacity for iPad to make particles more subtle
  if (isIOS) {
    particle.style.opacity = "0.15";
    particle.style.background = "rgba(255, 255, 255, 0.05)";
  }

  particle.style.animation = `float-particle ${duration}s ease-in-out infinite`;

  document.body.appendChild(particle);
  backgroundParticles.push(particle);

  return particle;
}

function updateBackgroundParticles() {
  // Remove existing particles
  backgroundParticles.forEach((particle) => {
    if (particle.parentNode) {
      document.body.removeChild(particle);
    }
  });
  backgroundParticles = [];

  // Create new particles for the new window size
  createBackgroundParticles();
}

function animateBackgroundParticles() {
  // Subtle movement of background particles in response to audio
  if (audioContext && ambientSound) {
    const analyser = audioContext.createAnalyser();
    ambientSound.connect(analyser);
    analyser.fftSize = 32;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function animate() {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;

      // Keeping audio analysis but removing brightness changes to maintain static background
      // as requested by user

      requestAnimationFrame(animate);
    }

    animate();
  }
}

// Helper function to show audio notifications
function showAudioNotification(message) {
  const notification = document.createElement("div");
  notification.className = "audio-notification";
  notification.textContent = message;
  document.body.appendChild(notification);

  // Show notification after short delay
  setTimeout(() => {
    notification.classList.add("show");
  }, 100);

  // Remove after a few seconds
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Create ambient background sound with continuous evolving drone/gamma wave and binaural beats
function createAmbientSound() {
  if (!audioContext) {
    console.error("No audio context available");
    return;
  }

  // Safety check - if context is suspended, try to resume it
  if (audioContext.state === "suspended") {
    // For iOS, we need to be more careful about resuming
    if (isIOS) {
      console.log(
        "Audio context suspended on iOS, waiting for user interaction"
      );
      // We'll let the interaction handlers deal with this
      return;
    } else {
      audioContext.resume().catch((err) => {
        console.error("Failed to resume audio context:", err);
        return; // Exit if we can't resume
      });
    }
  }

  // If we already created ambient sound, don't create it again
  if (ambientSound) {
    console.log("Ambient sound already created");
    return;
  }

  console.log(
    "Creating ambient sound, audio context state:",
    audioContext.state
  );

  // Create a master gain node for all ambient sounds
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 0.005; // Further reduced overall volume
  masterGain.connect(audioContext.destination);

  // Create binaural beats (base frequency with slight difference between ears)
  const baseFreq = 40 + Math.random() * 20;
  const beatFreq = 0.5 + Math.random() * 10; // Beat frequency (0.5-10.5 Hz)

  // Left ear oscillator
  const leftOsc = audioContext.createOscillator();
  leftOsc.type = "sine";
  leftOsc.frequency.value = baseFreq;

  // Right ear oscillator with slightly different frequency
  const rightOsc = audioContext.createOscillator();
  rightOsc.type = "sine";
  rightOsc.frequency.value = baseFreq + beatFreq;

  // Panner nodes for stereo effect
  const leftPanner = audioContext.createStereoPanner();
  leftPanner.pan.value = -0.5;
  const rightPanner = audioContext.createStereoPanner();
  rightPanner.pan.value = 0.5;

  // Connect binaural beat oscillators
  const beatGain = audioContext.createGain();
  beatGain.gain.value = 0.002; // Very subtle volume

  leftOsc.connect(leftPanner);
  rightOsc.connect(rightPanner);
  leftPanner.connect(beatGain);
  rightPanner.connect(beatGain);
  beatGain.connect(masterGain);

  // Start oscillators
  leftOsc.start();
  rightOsc.start();

  // Create a compressor for subtle dynamic control
  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 30;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  compressor.connect(audioContext.destination);

  // Create a low-frequency oscillator for ambient background
  const ambientOsc = audioContext.createOscillator();
  const ambientGain = audioContext.createGain();

  ambientOsc.type = "sine";
  ambientOsc.frequency.value = 40 + Math.random() * 20; // Very low frequency

  ambientGain.gain.value = 0.005; // Very quiet, further reduced

  ambientOsc.connect(ambientGain);
  ambientGain.connect(masterGain);

  ambientOsc.start();

  // Add evolving gamma wave drone (30-100 Hz)
  const droneOscillators = [];
  const droneGains = [];
  const droneFilters = [];

  // Create multiple oscillators for richer drone texture with more varied frequencies
  // Using harmonic relationships for more musical drones
  const baseFrequency = 40 + Math.random() * 5;
  const gammaFrequencies = [
    baseFrequency,
    baseFrequency * 1.5, // Perfect fifth
    baseFrequency * 1.25, // Major third
    baseFrequency * 2, // Octave
    baseFrequency * 0.75, // Perfect fourth below
  ];

  // Create oscillator types with more variety
  const oscTypes = ["sine", "triangle", "sine", "sawtooth", "triangle"];

  for (let i = 0; i < gammaFrequencies.length; i++) {
    const droneOsc = audioContext.createOscillator();
    const droneGain = audioContext.createGain();
    const droneFilter = audioContext.createBiquadFilter();

    // More varied oscillator types for richer texture
    droneOsc.type = oscTypes[i];

    // Add slight detuning for beating effects
    const detune = Math.random() * 10 - 5;
    droneOsc.detune.value = detune;

    // Base frequency with slight random variation
    droneOsc.frequency.value = gammaFrequencies[i] + (Math.random() * 3 - 1.5);

    // Varied gain levels for each oscillator
    droneGain.gain.value = 0.0025 - i * 0.00025; // Further reduced

    // Add more varied filtering
    const filterTypes = [
      "lowpass",
      "bandpass",
      "highpass",
      "lowpass",
      "bandpass",
    ];
    droneFilter.type = filterTypes[i];
    droneFilter.frequency.value = 200 + i * 100;
    droneFilter.Q.value = 0.5 + Math.random() * 2;

    // Connect the nodes
    droneOsc.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(masterGain);

    // Start the oscillator
    droneOsc.start();

    // Store references
    droneOscillators.push(droneOsc);
    droneGains.push(droneGain);
    droneFilters.push(droneFilter);

    // Add complex modulation to each oscillator
    // Primary LFO for frequency modulation
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();

    // Use different LFO shapes for each oscillator
    const lfoTypes = ["sine", "triangle", "sine", "triangle", "sine"];
    lfo.type = lfoTypes[i];

    // Each oscillator gets a different modulation rate
    lfo.frequency.value = 0.01 + i * 0.02 + Math.random() * 0.03; // Varied slow modulation

    // Different modulation depths
    lfoGain.gain.value = 1 + i * 0.8 + Math.random() * 1.5;

    lfo.connect(lfoGain);
    lfoGain.connect(droneOsc.frequency);
    lfo.start();

    // Secondary LFO for filter modulation
    const filterLfo = audioContext.createOscillator();
    const filterLfoGain = audioContext.createGain();

    filterLfo.type = lfoTypes[(i + 2) % lfoTypes.length]; // Offset for variety
    filterLfo.frequency.value = 0.007 + i * 0.005 + Math.random() * 0.01; // Ultra-slow modulation

    // Modulate filter frequency
    filterLfoGain.gain.value = 100 + i * 50 + Math.random() * 100;
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(droneFilter.frequency);
    filterLfo.start();

    // Tertiary LFO for amplitude modulation (tremolo)
    const ampLfo = audioContext.createOscillator();
    const ampLfoGain = audioContext.createGain();

    ampLfo.type = "sine";
    ampLfo.frequency.value = 0.1 + Math.random() * 0.2; // Slow amplitude variations

    ampLfoGain.gain.value = 0.0015; // Subtle tremolo effect, reduced

    // Create a constant offset to prevent silence
    const offset = audioContext.createConstantSource();
    offset.offset.value = 0.0025 - i * 0.00025; // Base gain level, reduced
    offset.start();

    // Mix the LFO with the offset for tremolo effect
    ampLfo.connect(ampLfoGain);
    ampLfoGain.connect(droneGain.gain);
    offset.connect(droneGain.gain);
    ampLfo.start();
  }

  // Create evolving harmonic shifts for the base oscillator
  const lfoFreq = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();

  lfoFreq.type = "triangle"; // Triangle for smoother transitions
  lfoFreq.frequency.value = 0.03; // Very slow modulation

  lfoGain.gain.value = 15; // Increased modulation amount for more variation

  lfoFreq.connect(lfoGain);
  lfoGain.connect(ambientOsc.frequency);
  lfoFreq.start();

  // Add occasional harmonic shifts using scheduled parameter changes
  // This creates subtle changes in the sound over time
  const now = audioContext.currentTime;

  // Schedule periodic changes to filter frequencies
  for (let i = 0; i < droneFilters.length; i++) {
    const filter = droneFilters[i];
    const baseFreq = 200 + i * 100;

    // Schedule several changes over the next few minutes
    for (let t = 10; t < 300; t += 20 + Math.random() * 30) {
      const newFreq = baseFreq * (0.5 + Math.random() * 1.5);
      filter.frequency.setTargetAtTime(newFreq, now + t, 10);
    }
  }

  // Schedule periodic changes to oscillator types for timbre variation
  for (let i = 0; i < droneOscillators.length; i++) {
    const osc = droneOscillators[i];
    const types = ["sine", "triangle", "sawtooth"];

    // Every 30-60 seconds, change the oscillator type
    for (let t = 30; t < 300; t += 30 + Math.random() * 30) {
      setTimeout(() => {
        const newType = types[Math.floor(Math.random() * types.length)];
        osc.type = newType;
      }, t * 1000);
    }
  }

  // Set the ambient sound reference to the master gain
  ambientSound = masterGain;
}

// Create a random circle with a corresponding chime
function createRandomCircle() {
  // Random size calculation with mobile device consideration
  const isMobile = window.innerWidth <= 768;
  const sizeRange = isMobile ? { min: 20, max: 200 } : { min: 30, max: 350 };
  const size =
    Math.floor(Math.random() * (sizeRange.max - sizeRange.min)) + sizeRange.min;

  // Get container height for offset
  const container = document.querySelector(".container");
  const containerHeight = container
    ? container.getBoundingClientRect().height
    : 0;

  // Random position ensuring circle is fully visible and below container
  const maxX = window.innerWidth - size;
  const maxY = window.innerHeight - size;
  const x = Math.floor(Math.random() * maxX);
  const y =
    Math.floor(Math.random() * (maxY - containerHeight)) + containerHeight;

  // Enhanced Buddhist-inspired color palette with more varied tones
  const colorPalettes = [
    { hue: 45, saturation: 85, lightness: 65 }, // Saffron/Kasaya (monk's robe)
    { hue: 35, saturation: 80, lightness: 60 }, // Warm gold (Buddha statues)
    { hue: 28, saturation: 75, lightness: 55 }, // Amber (sacred flame)
    { hue: 15, saturation: 70, lightness: 45 }, // Terra cotta (temple walls)
    { hue: 0, saturation: 65, lightness: 40 }, // Deep red (inner wisdom)
    { hue: 300, saturation: 45, lightness: 45 }, // Mauve purple (spiritual awakening)
    { hue: 270, saturation: 50, lightness: 40 }, // Royal purple (enlightenment)
    { hue: 240, saturation: 45, lightness: 35 }, // Indigo (deep meditation)
    { hue: 220, saturation: 60, lightness: 35 }, // Deep blue (infinite sky)
    { hue: 200, saturation: 55, lightness: 40 }, // Ocean blue (serenity)
    { hue: 180, saturation: 50, lightness: 35 }, // Teal (healing)
    { hue: 160, saturation: 45, lightness: 35 }, // Deep jade (harmony)
    { hue: 140, saturation: 40, lightness: 40 }, // Forest green (growth)
  ];

  // Use weighted random selection to favor certain colors
  const palette =
    colorPalettes[Math.floor(Math.random() * colorPalettes.length)];

  // More subtle variations for natural feel
  const hue = palette.hue + (Math.random() * 12 - 6); // Reduced variation range
  const saturation = palette.saturation + (Math.random() * 8 - 4); // More subtle variation
  const lightness = palette.lightness + (Math.random() * 6 - 3); // Finer lightness control
  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  // Create more harmonious gradient with controlled contrast
  const colorLight = `hsl(${hue}, ${Math.max(40, saturation - 15)}%, ${Math.min(
    75,
    lightness + 20
  )}%)`;

  // Random animation duration between 2 and 4 seconds
  const duration = Math.random() * 2 + 2;

  // Create circle element
  const circle = document.createElement("div");
  circle.className = "circle";
  circle.style.width = `${size}px`;
  circle.style.height = `${size}px`;
  circle.style.left = `${x}px`;
  circle.style.top = `${y}px`;
  circle.style.setProperty("--circle-color", color);
  circle.style.setProperty("--circle-color-light", colorLight);

  // Add variety to shapes and styles
  const shapeVariation = Math.random();

  // All shapes are circles
  circle.style.borderRadius = "50%";
  // Add varying border styles for hollow circles
  const borderStyle =
    Math.random() < 0.5 ? "solid" : Math.random() < 0.5 ? "dashed" : "dotted";
  const borderWidth = 2 + Math.floor(Math.random() * 4); // Thicker borders for hollow circles

  // Randomly decide if circle should start filled and fade to empty
  if (Math.random() < 0.3) {
    // 30% chance for filled-to-empty effect
    circle.style.background = color;
    circle.style.transition = "background 1s ease-in-out";
    setTimeout(() => {
      circle.style.background = "transparent";
    }, duration * 1000 * 0.7); // Start fading at 70% of animation duration
  } else {
    circle.style.border = `${borderWidth}px ${borderStyle} ${color}`; // Use the circle color for border
  }

  // Vary opacity
  const maxOpacity = 0.7 + Math.random() * 0.3;
  circle.style.setProperty("--max-opacity", maxOpacity);

  // Add different animation variations
  const animationType = Math.random();
  if (animationType < 0.3) {
    // Gentle pulsing
    const pulseSpeed = 2 + Math.random() * 2;
    circle.style.animation = `appear-disappear ${duration}s ease-in-out forwards, gentle-pulse ${pulseSpeed}s ease-in-out infinite`;
  } else if (animationType < 0.6) {
    // Rotation
    const rotationSpeed = 3 + Math.random() * 4;
    const rotationDirection = Math.random() > 0.5 ? 1 : -1;
    const maxRotation = 30 + Math.random() * 60;
    circle.style.animation = `appear-disappear ${duration}s ease-in-out forwards, rotate-${
      rotationDirection > 0 ? "cw" : "ccw"
    } ${rotationSpeed}s linear infinite`;
    circle.style.setProperty(
      "--max-rotation",
      `${maxRotation * rotationDirection}deg`
    );
  } else {
    // Default animation
    circle.style.animation = `appear-disappear ${duration}s ease-in-out forwards`;
  }

  // Add glow effect to some circles
  if (Math.random() < 0.3) {
    const glowSpeed = 2 + Math.random() * 3;
    circle.style.animation += `, glow-pulse ${glowSpeed}s ease-in-out infinite`;
  }

  circle.style.animationDuration = `${duration}s`;

  // Add to DOM
  document.body.appendChild(circle);

  // Create ripple effect
  createRippleEffect(x + size / 2, y + size / 2, size, color);

  // Create particle trail
  createParticleTrail(x + size / 2, y + size / 2, size, color);

  // Play chime sound based on circle size
  playChime(size);

  // Remove circle from DOM after animation completes
  setTimeout(() => {
    if (circle.parentNode) {
      document.body.removeChild(circle);
    }
  }, duration * 1000);
}

// Create ripple effect when circles appear
function createRippleEffect(x, y, size, color) {
  // Detect if we're on iPad/iOS
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isMobile = window.innerWidth <= 768;

  // Skip ripple effect on iOS/mobile devices if it's disabled in CSS
  if (
    (isIOS || isMobile) &&
    window.getComputedStyle(
      document.querySelector(".ripple") || document.createElement("div")
    ).display === "none"
  ) {
    return; // Don't create ripples on iOS/mobile if they're disabled
  }

  const ripple = document.createElement("div");
  ripple.className = "ripple";

  // Adjust size for mobile
  const rippleSize = isIOS || isMobile ? size * 1.2 : size * 1.5;
  ripple.style.width = `${rippleSize}px`;
  ripple.style.height = `${rippleSize}px`;
  ripple.style.left = `${x - rippleSize / 2}px`;
  ripple.style.top = `${y - rippleSize / 2}px`;

  // Adjust opacity and border for iOS
  if (isIOS || isMobile) {
    ripple.style.opacity = "0.3";
    ripple.style.border = "1px solid " + color;
  } else {
    ripple.style.setProperty("--circle-color", color);
  }

  // Apply hardware acceleration
  ripple.style.transform = "translateZ(0)";
  ripple.style.webkitTransform = "translateZ(0)";
  ripple.style.backfaceVisibility = "hidden";
  ripple.style.webkitBackfaceVisibility = "hidden";

  document.body.appendChild(ripple);

  // Remove ripple after animation completes (shorter duration on iOS)
  setTimeout(
    () => {
      if (ripple.parentNode) {
        document.body.removeChild(ripple);
      }
    },
    isIOS || isMobile ? 1500 : 2000
  );
}

// Create particle trail effect
function createParticleTrail(x, y, size, color) {
  // Detect if we're on iPad/iOS
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isMobile = window.innerWidth <= 768;

  // Adjust particle count and size for different devices
  let particleCount = Math.floor(size / 10); // Default for desktop

  // Reduce particle count and size for mobile/iPad
  if (isIOS || isMobile) {
    particleCount = Math.min(particleCount, 8); // Fewer particles on iOS
  }

  for (let i = 0; i < particleCount; i++) {
    setTimeout(() => {
      const particle = document.createElement("div");
      particle.className = "particle";

      // Smaller, more consistent particle size for iPad/mobile
      let particleSize;
      if (isIOS || isMobile) {
        particleSize = 1 + Math.random() * 2; // Much smaller for iOS
      } else {
        particleSize = 2 + Math.random() * 5; // Regular size for desktop
      }

      particle.style.width = `${particleSize}px`;
      particle.style.height = `${particleSize}px`;

      // Position around the circle with more controlled randomness
      const angle = Math.random() * Math.PI * 2;
      const distance = (size / 2) * (0.3 + Math.random() * 0.7); // More consistent distance
      const particleX = x + Math.cos(angle) * distance;
      const particleY = y + Math.sin(angle) * distance;

      particle.style.left = `${particleX}px`;
      particle.style.top = `${particleY}px`;

      // Use a slightly lighter version of the circle color with reduced opacity for iOS
      const hsl = color.match(/\d+/g);
      if (hsl && hsl.length >= 3) {
        const h = parseInt(hsl[0]);
        const s = parseInt(hsl[1]);
        const l = Math.min(parseInt(hsl[2]) + 20, 90); // Lighter

        // Lower opacity for iOS
        const opacity = isIOS || isMobile ? 0.4 : 0.6;

        particle.style.setProperty(
          "--particle-color",
          `hsla(${h}, ${s}%, ${l}%, ${opacity})`
        );
      }

      // More controlled movement for iOS
      const maxMove = isIOS || isMobile ? 20 : 50;
      const xMove = (Math.random() - 0.5) * maxMove;
      const yMove = (Math.random() - 0.5) * maxMove;
      const duration =
        isIOS || isMobile ? 0.8 + Math.random() * 1 : 1 + Math.random() * 2;

      // Use transform for better performance
      particle.style.transition = `transform ${duration}s ease-out, opacity ${duration}s ease-out`;

      // Apply hardware acceleration
      particle.style.transform = "translateZ(0)";
      particle.style.webkitTransform = "translateZ(0)";

      document.body.appendChild(particle);

      // Animate particle movement
      requestAnimationFrame(() => {
        particle.style.transform = `translate3d(${xMove}px, ${yMove}px, 0)`;
        particle.style.opacity = "0";
      });

      // Remove particle after animation
      setTimeout(() => {
        if (particle.parentNode) {
          document.body.removeChild(particle);
        }
      }, duration * 1000);
    }, i * (isIOS || isMobile ? 30 : 50)); // Faster creation on iOS
  }
}

// Play special sound effects occasionally
let lastSpecialEffectTime = 0;
function playSpecialEffect() {
  if (!audioContext) return;

  const now = Date.now();
  // Only play special effects at least 10 seconds apart
  if (now - lastSpecialEffectTime < 10000) return;

  lastSpecialEffectTime = now;

  // Special effect types
  const effectTypes = [
    "wind_chime",
    "temple_bell",
    "meditation_bowl",
    "tibetan_bowl",
    "himalayan_bowl",
    "solfeggio",
    "nature_sound",
  ];

  const effectType =
    effectTypes[Math.floor(Math.random() * effectTypes.length)];

  // Create special effect sound
  const specialOsc = audioContext.createOscillator();
  const specialGain = audioContext.createGain();
  const specialFilter = audioContext.createBiquadFilter();
  const specialPan = audioContext.createStereoPanner();

  // Configure based on effect type
  switch (effectType) {
    case "himalayan_bowl":
      // Create a complex Himalayan bowl sound with specific metal alloy characteristics
      specialOsc.type = "sine";
      specialOsc.frequency.value = 126 + Math.random() * 30; // Specific frequency range for Himalayan bowls

      // Create additional oscillators for the unique harmonic profile of Himalayan bowls
      const himalayanHarmonic1 = audioContext.createOscillator();
      const himalayanHarmonic2 = audioContext.createOscillator();
      const himalayanHarmonic3 = audioContext.createOscillator();
      const himalayanHarmonic1Gain = audioContext.createGain();
      const himalayanHarmonic2Gain = audioContext.createGain();
      const himalayanHarmonic3Gain = audioContext.createGain();

      // Set harmonic frequencies based on the unique metal alloy characteristics
      himalayanHarmonic1.type = "sine";
      himalayanHarmonic1.frequency.value = specialOsc.frequency.value * 2.76; // Specific harmonic ratio
      himalayanHarmonic1Gain.gain.value = 0.08; // Reduced from 0.17

      himalayanHarmonic2.type = "sine";
      himalayanHarmonic2.frequency.value = specialOsc.frequency.value * 4.95; // Specific harmonic ratio
      himalayanHarmonic2Gain.gain.value = 0.04; // Reduced from 0.08

      himalayanHarmonic3.type = "sine";
      himalayanHarmonic3.frequency.value = specialOsc.frequency.value * 1.38; // Lower harmonic for depth
      himalayanHarmonic3Gain.gain.value = 0.06; // Reduced from 0.12

      // Connect harmonics
      himalayanHarmonic1.connect(himalayanHarmonic1Gain);
      himalayanHarmonic2.connect(himalayanHarmonic2Gain);
      himalayanHarmonic3.connect(himalayanHarmonic3Gain);
      himalayanHarmonic1Gain.connect(specialFilter);
      himalayanHarmonic2Gain.connect(specialFilter);
      himalayanHarmonic3Gain.connect(specialFilter);

      // Start harmonics
      himalayanHarmonic1.start();
      himalayanHarmonic2.start();
      himalayanHarmonic3.start();

      // Schedule stop with moderate decay for Himalayan bowls
      const himalayanStopTime = audioContext.currentTime + 6; // Reduced from 10 seconds
      himalayanHarmonic1.stop(himalayanStopTime);
      himalayanHarmonic2.stop(himalayanStopTime);
      himalayanHarmonic3.stop(himalayanStopTime);

      // Configure filter for the unique resonant quality of Himalayan bowls
      specialFilter.type = "bandpass";
      specialFilter.frequency.value = 180;
      specialFilter.Q.value = 10; // Reduced from 18 for less resonance

      // Configure amplitude envelope with the characteristic slow attack and long decay
      specialGain.gain.value = 0.01; // Start quiet
      specialGain.gain.linearRampToValueAtTime(
        0.25,
        audioContext.currentTime + 0.5
      ); // Slow attack
      specialGain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 10 // Very long decay
      );
      break;

    case "solfeggio":
      // Create a Solfeggio frequency sound with healing properties
      specialOsc.type = "sine";

      // Select one of the Solfeggio frequencies
      const solfeggioFrequencies = [
        396, // UT - Liberating guilt and fear
        417, // RE - Undoing situations and facilitating change
        528, // MI - Transformation and miracles (DNA repair)
        639, // FA - Connecting/relationships
        741, // SOL - Awakening intuition
        852, // LA - Returning to spiritual order
      ];

      // Choose a random Solfeggio frequency
      const chosenFrequency =
        solfeggioFrequencies[
          Math.floor(Math.random() * solfeggioFrequencies.length)
        ];
      specialOsc.frequency.value = chosenFrequency;

      // Create subtle harmonics to enhance the healing properties
      const solfeggioHarmonic = audioContext.createOscillator();
      const solfeggioHarmonicGain = audioContext.createGain();

      solfeggioHarmonic.type = "sine";
      solfeggioHarmonic.frequency.value = chosenFrequency * 2; // Octave harmonic
      solfeggioHarmonicGain.gain.value = 0.06; // Very subtle

      solfeggioHarmonic.connect(solfeggioHarmonicGain);
      solfeggioHarmonicGain.connect(specialFilter);
      solfeggioHarmonic.start();
      solfeggioHarmonic.stop(audioContext.currentTime + 7);

      // Configure filter for pure, clear tone
      specialFilter.type = "lowpass";
      specialFilter.frequency.value = 2000;
      specialFilter.Q.value = 1;

      // Configure amplitude envelope with gentle attack and long sustain
      specialGain.gain.value = 0;
      specialGain.gain.linearRampToValueAtTime(
        0.2,
        audioContext.currentTime + 1.5
      ); // Gentle attack
      specialGain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 7 // Long sustain
      );
      break;

    case "wind_chime":
      specialOsc.type = "sine";
      specialOsc.frequency.value = 800 + Math.random() * 400;
      specialFilter.type = "highpass";
      specialFilter.frequency.value = 700;
      specialFilter.Q.value = 5;
      specialGain.gain.value = 0.15;
      // Random sequence of notes
      for (let i = 0; i < 5; i++) {
        const time = audioContext.currentTime + i * 0.2;
        specialOsc.frequency.setValueAtTime(700 + Math.random() * 500, time);
        specialGain.gain.setValueAtTime(0.15, time);
        specialGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      }
      break;

    case "temple_bell":
      specialOsc.type = "triangle";
      specialOsc.frequency.value = 200 + Math.random() * 100;
      specialFilter.type = "lowpass";
      specialFilter.frequency.value = 1000;
      specialGain.gain.value = 0.3;
      specialGain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 4
      );
      break;

    case "meditation_bowl":
      specialOsc.type = "sine";
      specialOsc.frequency.value = 150 + Math.random() * 50;
      specialFilter.type = "bandpass";
      specialFilter.frequency.value = 200;
      specialFilter.Q.value = 10;
      specialGain.gain.value = 0.25;
      specialGain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 6
      );
      break;

    case "tibetan_bowl":
      // Create a more complex Tibetan bowl sound with multiple oscillators
      specialOsc.type = "sine";
      specialOsc.frequency.value = 110 + Math.random() * 40; // Lower fundamental frequency

      // Create additional oscillators for rich harmonics
      const tibetanHarmonic1 = audioContext.createOscillator();
      const tibetanHarmonic2 = audioContext.createOscillator();
      const tibetanHarmonic1Gain = audioContext.createGain();
      const tibetanHarmonic2Gain = audioContext.createGain();

      // Set harmonic frequencies based on spectral analysis of real Tibetan bowls
      tibetanHarmonic1.type = "sine";
      tibetanHarmonic1.frequency.value = specialOsc.frequency.value * 2.3;
      tibetanHarmonic1Gain.gain.value = 0.07; // Reduced from 0.15

      tibetanHarmonic2.type = "sine";
      tibetanHarmonic2.frequency.value = specialOsc.frequency.value * 3.4;
      tibetanHarmonic2Gain.gain.value = 0.05; // Reduced from 0.1

      // Connect harmonics
      tibetanHarmonic1.connect(tibetanHarmonic1Gain);
      tibetanHarmonic2.connect(tibetanHarmonic2Gain);
      tibetanHarmonic1Gain.connect(specialFilter);
      tibetanHarmonic2Gain.connect(specialFilter);

      // Start harmonics
      tibetanHarmonic1.start();
      tibetanHarmonic2.start();

      // Schedule stop
      const stopTime = audioContext.currentTime + 5; // Reduced from 8 seconds
      tibetanHarmonic1.stop(stopTime);
      tibetanHarmonic2.stop(stopTime);

      // Configure filter for resonant Tibetan bowl sound
      specialFilter.type = "bandpass";
      specialFilter.frequency.value = 150;
      specialFilter.Q.value = 8; // Reduced from 15 for less resonance

      // Configure amplitude envelope
      specialGain.gain.value = 0.15; // Reduced from 0.3
      specialGain.gain.setValueAtTime(0.15, audioContext.currentTime);
      specialGain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 5 // Reduced from 8 seconds
      );
      break;

    case "nature_sound":
      specialOsc.type = "sawtooth";
      specialOsc.frequency.value = 100 + Math.random() * 200;
      specialFilter.type = "bandpass";
      specialFilter.frequency.value = 300;
      specialFilter.Q.value = 1;
      specialGain.gain.value = 0.1;
      // Create water-like effect
      for (let i = 0; i < 10; i++) {
        const time = audioContext.currentTime + i * 0.3;
        specialFilter.frequency.setValueAtTime(200 + Math.random() * 300, time);
        specialGain.gain.setValueAtTime(0.05 + Math.random() * 0.1, time);
      }
      specialGain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 3
      );
      break;
  }

  // Random pan position
  specialPan.pan.value = Math.random() * 2 - 1; // -1 to 1

  // Connect nodes
  specialOsc.connect(specialFilter);
  specialFilter.connect(specialGain);
  specialGain.connect(specialPan);
  specialPan.connect(audioContext.destination);

  // Start oscillator
  specialOsc.start();
  specialOsc.stop(audioContext.currentTime + 6);

  // Create visual effect for special sound
  createSpecialVisualEffect(effectType);
}

// Create visual effect for special sounds
function createSpecialVisualEffect(effectType) {
  const width = window.innerWidth;
  const height = window.innerHeight;

  switch (effectType) {
    case "himalayan_bowl":
      // Create concentric rings with golden-copper hue
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const ring = document.createElement("div");
          ring.className = "ripple";
          const size = Math.min(width, height) * (0.3 + i * 0.15);
          ring.style.width = `${size}px`;
          ring.style.height = `${size}px`;
          ring.style.left = `${width / 2 - size / 2}px`;
          ring.style.top = `${height / 2 - size / 2}px`;
          ring.style.setProperty("--circle-color", "rgba(205, 127, 50, 0.25)"); // Copper-gold color
          ring.style.animation = `ripple-effect ${6 + i}s ease-out forwards`;

          document.body.appendChild(ring);

          setTimeout(() => {
            if (ring.parentNode) {
              document.body.removeChild(ring);
            }
          }, (6 + i) * 1000);
        }, i * 500);
      }
      break;

    case "solfeggio":
      // Create a gentle pulsing glow with geometric patterns
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.top = "0";
      container.style.left = "0";
      container.style.display = "flex";
      container.style.justifyContent = "center";
      container.style.alignItems = "center";
      container.style.pointerEvents = "none";
      container.style.zIndex = "5";

      // Create sacred geometry pattern (hexagon)
      const pattern = document.createElement("div");
      const patternSize = Math.min(width, height) * 0.4;
      pattern.style.width = `${patternSize}px`;
      pattern.style.height = `${patternSize}px`;
      pattern.style.borderRadius = "50%";
      pattern.style.background = "transparent";
      pattern.style.border = "1px solid rgba(255, 255, 255, 0.2)";
      pattern.style.boxShadow = "0 0 50px rgba(255, 255, 255, 0.3)";
      pattern.style.opacity = "0";
      pattern.style.transition = "all 1.5s ease-in-out";

      container.appendChild(pattern);
      document.body.appendChild(container);

      // Animate pattern
      setTimeout(() => {
        pattern.style.opacity = "0.8";
        pattern.style.transform = "rotate(30deg)";
      }, 100);

      // Pulse effect
      let pulseCount = 0;
      const pulseInterval = setInterval(() => {
        pattern.style.transform = `rotate(${30 + pulseCount * 15}deg) scale(${
          1 + (pulseCount % 2) * 0.1
        })`;
        pulseCount++;

        if (pulseCount > 10) {
          clearInterval(pulseInterval);
          pattern.style.opacity = "0";
          setTimeout(() => {
            if (container.parentNode) {
              document.body.removeChild(container);
            }
          }, 1500);
        }
      }, 700);
      break;
    case "wind_chime":
      // Create multiple small particles falling from top
      for (let i = 0; i < 20; i++) {
        setTimeout(() => {
          const x = Math.random() * width;
          const particle = document.createElement("div");
          particle.className = "particle";
          particle.style.width = "3px";
          particle.style.height = "3px";
          particle.style.left = `${x}px`;
          particle.style.top = "0px";
          particle.style.setProperty(
            "--particle-color",
            "rgba(255, 255, 255, 0.8)"
          );

          document.body.appendChild(particle);

          // Animate falling
          setTimeout(() => {
            particle.style.transition = "all 3s ease-in";
            particle.style.transform = `translate(${
              (Math.random() - 0.5) * 100
            }px, ${height}px)`;
            particle.style.opacity = "0";
          }, 10);

          // Remove particle
          setTimeout(() => {
            if (particle.parentNode) {
              document.body.removeChild(particle);
            }
          }, 3000);
        }, i * 100);
      }
      break;

    case "temple_bell":
      // Create expanding ring
      const ring = document.createElement("div");
      ring.className = "ripple";
      const size = Math.min(width, height) * 0.5;
      ring.style.width = `${size}px`;
      ring.style.height = `${size}px`;
      ring.style.left = `${width / 2 - size / 2}px`;
      ring.style.top = `${height / 2 - size / 2}px`;
      ring.style.setProperty("--circle-color", "rgba(255, 215, 0, 0.3)");
      ring.style.animation = "ripple-effect 4s ease-out forwards";

      document.body.appendChild(ring);

      setTimeout(() => {
        if (ring.parentNode) {
          document.body.removeChild(ring);
        }
      }, 4000);
      break;

    case "meditation_bowl":
      // Create gentle glow effect
      document.body.style.transition = "filter 3s ease-in-out";
      document.body.style.filter = "brightness(1.3) saturate(1.2)";

      setTimeout(() => {
        document.body.style.filter = "";
      }, 3000);
      break;

    case "nature_sound":
      // Create water-like ripples
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const x = Math.random() * width;
          const y = Math.random() * height;
          const rippleSize = 20 + Math.random() * 60;

          const ripple = document.createElement("div");
          ripple.className = "ripple";
          ripple.style.width = `${rippleSize}px`;
          ripple.style.height = `${rippleSize}px`;
          ripple.style.left = `${x - rippleSize / 2}px`;
          ripple.style.top = `${y - rippleSize / 2}px`;
          ripple.style.setProperty(
            "--circle-color",
            "rgba(100, 200, 255, 0.3)"
          );

          document.body.appendChild(ripple);

          setTimeout(() => {
            if (ripple.parentNode) {
              document.body.removeChild(ripple);
            }
          }, 2000);
        }, i * 300);
      }
      break;
  }
}

// Play a diverse range of sounds based on the circle size
function playChime(size) {
  if (!audioContext) return;

  // Map size to frequency (larger circles = lower tones)
  // Size range: 30-350, Frequency range: 70-500 Hz (adjusted for more authentic singing bowl range)
  const baseFrequency = 500 - ((size - 30) / 320) * 430;

  // Select a sound profile based on circle size and randomness for more diversity
  const soundProfiles = [
    "singing_bowl", // Traditional singing bowl sound
    "tibetan_singing_bowl", // Authentic Tibetan singing bowl sound
    "crystal_bowl", // Higher, more crystalline sound
    "gong", // Deep, resonant gong sound
    "bell", // Sharper, more bell-like sound
    "water_chime", // Fluid, water-like sound
    "church_bell", // Church bell sound
    // "brain_wave", // Meditative brain wave frequencies
    "didgeridoo", // Deep resonant Aboriginal instrument sound
  ];

  // Choose sound profile based on size ranges and randomness
  let soundProfile;
  if (size < 80) {
    // Small circles - higher chance of bell, crystal, or church bell sounds
    soundProfile =
      Math.random() < 0.7
        ? Math.random() < 0.6
          ? Math.random() < 0.5
            ? "crystal_bowl"
            : "bell"
          : "church_bell"
        : soundProfiles[Math.floor(Math.random() * soundProfiles.length)];
  } else if (size < 200) {
    // Medium circles - more balanced distribution with church bells and brain waves
    soundProfile =
      Math.random() < 0.3
        ? "brain_wave"
        : soundProfiles[Math.floor(Math.random() * soundProfiles.length)];
  } else {
    // Large circles - higher chance of deeper sounds, brain waves, and church bells for large circles
    soundProfile =
      Math.random() < 0.7
        ? Math.random() < 0.6
          ? Math.random() < 0.33
            ? Math.random() < 0.5
              ? "singing_bowl"
              : "tibetan_singing_bowl"
            : Math.random() < 0.5
            ? "gong"
            : "brain_wave"
          : "church_bell"
        : soundProfiles[Math.floor(Math.random() * soundProfiles.length)];
  }

  // Create oscillators and effects for richer sound
  const primaryOsc = audioContext.createOscillator();
  const harmonicOsc = audioContext.createOscillator();
  const secondHarmonicOsc = audioContext.createOscillator();
  const thirdHarmonicOsc = audioContext.createOscillator();
  const fourthHarmonicOsc = audioContext.createOscillator(); // Added fourth harmonic
  const modulatorOsc = audioContext.createOscillator();
  const subharmonicOsc = audioContext.createOscillator(); // Added subharmonic for depth

  // Gain nodes for volume control - reduced volume for better balance with ambient drone
  const gainNode = audioContext.createGain();
  const harmonicGain = audioContext.createGain();
  const secondHarmonicGain = audioContext.createGain();
  const thirdHarmonicGain = audioContext.createGain();
  const fourthHarmonicGain = audioContext.createGain(); // Added gain for fourth harmonic
  const modulatorGain = audioContext.createGain();
  const subharmonicGain = audioContext.createGain(); // Added gain for subharmonic

  // Master gain node for overall volume control of chimes
  const chimesMasterGain = audioContext.createGain();
  chimesMasterGain.gain.value = 0.15; // Reduce overall chime volume to 15%

  // Effects nodes
  const panNode = audioContext.createStereoPanner();
  const filterNode = audioContext.createBiquadFilter();
  const secondFilterNode = audioContext.createBiquadFilter(); // Second filter for more complex tone shaping
  const reverbNode = audioContext.createGain(); // Simulating reverb with decay

  // Random pan position for spatial effect - more subtle for meditation
  panNode.pan.value = Math.random() * 1.2 - 0.6; // -0.6 to 0.6 (more centered)

  // Filter setup for warmer tone
  filterNode.type = "lowpass";
  filterNode.frequency.value = 1200 + Math.random() * 800; // Lower cutoff for warmer tone
  filterNode.Q.value = 1.2 + Math.random() * 0.6; // Higher Q for more resonance

  // Configure second filter based on sound profile for more diverse tone shaping
  switch (soundProfile) {
    case "brain_wave":
      secondFilterNode.type = "lowpass";
      secondFilterNode.frequency.value = 100 + Math.random() * 150; // Very low frequency emphasis
      secondFilterNode.Q.value = 0.7 + Math.random() * 0.5; // Wide band for smooth sound
      break;

    case "singing_bowl":
      secondFilterNode.type = "bandpass";
      secondFilterNode.frequency.value = 200 + Math.random() * 300; // Emphasize fundamental
      secondFilterNode.Q.value = 2.5 + Math.random() * 1.5; // Narrow band for resonance
      break;

    case "tibetan_singing_bowl":
      secondFilterNode.type = "bandpass";
      secondFilterNode.frequency.value = 150 + Math.random() * 200; // Lower fundamental for Tibetan bowls
      secondFilterNode.Q.value = 3.5 + Math.random() * 2.0; // Higher resonance for richer sound
      break;

    case "crystal_bowl":
      secondFilterNode.type = "bandpass";
      secondFilterNode.frequency.value = 400 + Math.random() * 400; // Higher emphasis
      secondFilterNode.Q.value = 4.0 + Math.random() * 2.0; // Sharper resonance
      break;

    case "gong":
      secondFilterNode.type = "lowshelf";
      secondFilterNode.frequency.value = 150 + Math.random() * 150; // Boost low end
      secondFilterNode.gain.value = 3.0 + Math.random() * 3.0; // Significant boost
      break;

    case "bell":
      // secondFilterNode.type = "peaking";
      // secondFilterNode.frequency.value = 800 + Math.random() * 1200; // Mid-high emphasis
      // secondFilterNode.Q.value = 5.0 + Math.random() * 3.0; // Very narrow band
      // secondFilterNode.gain.value = 4.0 + Math.random() * 4.0; // Strong emphasis
      break;

    case "church_bell":
      secondFilterNode.type = "peaking";
      secondFilterNode.frequency.value = 600 + Math.random() * 800; // Mid-range emphasis for church bells
      secondFilterNode.Q.value = 6.0 + Math.random() * 4.0; // Very narrow band for resonance
      secondFilterNode.gain.value = 5.0 + Math.random() * 3.0; // Strong emphasis
      break;

    case "water_chime":
      secondFilterNode.type = "allpass";
      secondFilterNode.frequency.value = 500 + Math.random() * 500; // Phase shifting
      secondFilterNode.Q.value = 1.0 + Math.random() * 2.0; // Moderate resonance
      break;

    case "didgeridoo":
      secondFilterNode.type = "lowshelf";
      secondFilterNode.frequency.value = 100 + Math.random() * 100; // Emphasize low frequencies
      secondFilterNode.gain.value = 4.0 + Math.random() * 3.0; // Strong low-end boost
      break;

    default: // Fallback to singing bowl
      secondFilterNode.type = "bandpass";
      secondFilterNode.frequency.value = 200 + Math.random() * 300;
      secondFilterNode.Q.value = 2.5 + Math.random() * 1.5;
  }

  // Connect nodes
  primaryOsc.connect(gainNode);

  // Connect harmonics with varying gains
  harmonicOsc.connect(harmonicGain);
  secondHarmonicOsc.connect(secondHarmonicGain);
  thirdHarmonicOsc.connect(thirdHarmonicGain);
  fourthHarmonicOsc.connect(fourthHarmonicGain);
  subharmonicOsc.connect(subharmonicGain);

  harmonicGain.connect(gainNode);
  secondHarmonicGain.connect(gainNode);
  thirdHarmonicGain.connect(gainNode);
  fourthHarmonicGain.connect(gainNode);
  subharmonicGain.connect(gainNode);

  // Modulator for subtle frequency modulation
  modulatorOsc.connect(modulatorGain);
  modulatorGain.connect(gainNode);

  // We're using the master gain node already created above
  // No need to redeclare chimesMasterGain

  // Split the signal path for more complex processing
  gainNode.connect(filterNode);
  gainNode.connect(secondFilterNode);
  filterNode.connect(panNode);
  secondFilterNode.connect(panNode);
  panNode.connect(reverbNode);
  // Connect to master gain instead of directly to destination
  reverbNode.connect(chimesMasterGain);
  chimesMasterGain.connect(audioContext.destination);

  // Configure oscillators based on the selected sound profile
  let harmonicRatio,
    secondHarmonicRatio,
    thirdHarmonicRatio,
    fourthHarmonicRatio;
  let attackTime, decayTime, sustainLevel, releaseTime;

  switch (soundProfile) {
    case "brain_wave":
      // Brain wave - pure sine waves with very slow modulation
      primaryOsc.type = "sine";
      harmonicOsc.type = "sine";
      secondHarmonicOsc.type = "sine";
      thirdHarmonicOsc.type = "sine";
      fourthHarmonicOsc.type = "sine";
      subharmonicOsc.type = "sine";

      // Brain wave frequency ratios - based on actual brain wave frequencies
      // Delta (0.5-4Hz), Theta (4-8Hz), Alpha (8-13Hz), Beta (13-30Hz), Gamma (30-100Hz)
      const brainWaveBase = 4 + Math.random() * 8; // Base in theta/alpha range (4-12Hz)

      // Use frequency ratios that create brain wave frequency differences
      harmonicRatio = 1.0 + Math.random() * 0.2; // Very close to fundamental
      secondHarmonicRatio = 1.5 + Math.random() * 0.3; // Alpha/Beta range
      thirdHarmonicRatio = 2.0 + Math.random() * 0.4; // Beta range
      fourthHarmonicRatio = 3.0 + Math.random() * 0.5; // Higher Beta/Gamma range

      // Very slow attack and release for meditative quality
      attackTime = 0.5 + Math.random() * 1.0; // Very slow attack
      decayTime = 1.0 + Math.random() * 1.5; // Slow decay
      sustainLevel = 0.3 + Math.random() * 0.2; // Reduced sustain level
      releaseTime = 8.0 + Math.random() * 7.0; // Very long release

      // Very slow modulation for brain wave pulsing
      modulatorOsc.type = "sine";
      modulatorOsc.frequency.value = 0.1 + Math.random() * 0.3; // Extremely slow (0.1-0.4Hz)
      modulatorGain.gain.value = 0.25 + Math.random() * 0.2; // Reduced modulation depth

      // Strong subharmonic for deep brain wave effect
      subharmonicOsc.frequency.value = brainWaveBase; // Use actual brain wave frequency
      subharmonicGain.gain.value = 0.3 + Math.random() * 0.2; // Reduced subharmonic
      break;

    case "singing_bowl":
      // Traditional singing bowl - predominantly sine waves with longer decay
      primaryOsc.type = Math.random() < 0.85 ? "sine" : "triangle";
      harmonicOsc.type = "sine";
      secondHarmonicOsc.type = Math.random() < 0.7 ? "sine" : "triangle";
      thirdHarmonicOsc.type = "sine";
      fourthHarmonicOsc.type = "sine";
      subharmonicOsc.type = "sine";

      // Traditional singing bowl harmonic ratios
      harmonicRatio = [1.5, 1.78, 2.0][Math.floor(Math.random() * 3)];
      secondHarmonicRatio = [2.67, 3.0, 3.33][Math.floor(Math.random() * 3)];
      thirdHarmonicRatio = [4.0, 4.5, 5.0][Math.floor(Math.random() * 3)];
      fourthHarmonicRatio = [6.0, 7.0, 8.0][Math.floor(Math.random() * 3)];

      // Longer decay for singing bowls
      attackTime = 0.08 + Math.random() * 0.2;
      decayTime = 0.6 + Math.random() * 0.8;
      sustainLevel = 0.2 + Math.random() * 0.15;
      releaseTime = 4.0 + Math.random() * 5.0;

      // Modulation settings
      modulatorOsc.type = "sine";
      modulatorOsc.frequency.value = 2 + Math.random() * 2; // Slower modulation (2-4Hz)
      modulatorGain.gain.value = 0.1 + Math.random() * 0.25; // Further reduced modulation

      // Subharmonic settings
      subharmonicOsc.frequency.value = baseFrequency * 0.5;
      subharmonicGain.gain.value = 0.05 + Math.random() * 0.035; // Further reduced subharmonic
      break;

    case "tibetan_singing_bowl":
      // Authentic Tibetan singing bowl - deep resonant frequencies with rich harmonics
      primaryOsc.type = Math.random() < 0.9 ? "sine" : "triangle";
      harmonicOsc.type = "sine";
      secondHarmonicOsc.type = "sine";
      thirdHarmonicOsc.type = Math.random() < 0.8 ? "sine" : "triangle";
      fourthHarmonicOsc.type = "sine";
      subharmonicOsc.type = "sine";

      // Tibetan singing bowl harmonic ratios - based on spectral analysis of real bowls
      harmonicRatio = [1.4, 1.7, 1.9][Math.floor(Math.random() * 3)];
      secondHarmonicRatio = [2.3, 2.5, 2.8][Math.floor(Math.random() * 3)];
      thirdHarmonicRatio = [3.4, 3.7, 4.0][Math.floor(Math.random() * 3)];
      fourthHarmonicRatio = [5.2, 5.8, 6.4][Math.floor(Math.random() * 3)];

      // Moderate decay for authentic Tibetan bowls
      attackTime = 0.1 + Math.random() * 0.2;
      decayTime = 0.6 + Math.random() * 0.8; // Reduced from 0.8-2.0
      sustainLevel = 0.15 + Math.random() * 0.15; // Reduced from 0.25-0.45
      releaseTime = 3.0 + Math.random() * 4.0; // Reduced from 6.0-14.0

      // Gentle beating modulation characteristic of Tibetan bowls
      modulatorOsc.type = "sine";
      modulatorOsc.frequency.value = 1.2 + Math.random() * 1.5; // Slightly faster modulation
      modulatorGain.gain.value = 0.08 + Math.random() * 0.12; // Reduced from 0.15-0.35

      // Reduced subharmonic for gentler resonance
      subharmonicOsc.frequency.value = baseFrequency * 0.5;
      subharmonicGain.gain.value = 0.06 + Math.random() * 0.04; // Reduced from 0.12-0.20
      break;

    case "church_bell":
      // Church bell - mix of triangle and sine with strong harmonics
      primaryOsc.type = Math.random() < 0.6 ? "triangle" : "sine";
      harmonicOsc.type = Math.random() < 0.7 ? "triangle" : "sine";
      secondHarmonicOsc.type = Math.random() < 0.5 ? "triangle" : "sine";
      thirdHarmonicOsc.type = Math.random() < 0.3 ? "sawtooth" : "triangle";
      fourthHarmonicOsc.type = "triangle";
      subharmonicOsc.type = "sine";

      // Church bell harmonic ratios - more perfect harmonics
      harmonicRatio = [2.0, 2.4, 3.0][Math.floor(Math.random() * 3)];
      secondHarmonicRatio = [3.0, 4.0, 5.0][Math.floor(Math.random() * 3)];
      thirdHarmonicRatio = [5.0, 6.0, 7.0][Math.floor(Math.random() * 3)];
      fourthHarmonicRatio = [8.0, 10.0, 12.0][Math.floor(Math.random() * 3)];

      // Sharp attack, long decay for church bells
      attackTime = 0.01 + Math.random() * 0.03;
      decayTime = 0.5 + Math.random() * 0.7;
      sustainLevel = 0.15 + Math.random() * 0.1;
      releaseTime = 5.0 + Math.random() * 7.0; // Long tail

      // Minimal modulation for clarity
      modulatorOsc.type = "sine";
      modulatorOsc.frequency.value = 1 + Math.random() * 1.5;
      modulatorGain.gain.value = 0.035 + Math.random() * 0.065; // Further reduced modulation

      // Moderate subharmonic for depth
      subharmonicOsc.frequency.value = baseFrequency * 0.5;
      subharmonicGain.gain.value = 0.12 + Math.random() * 0.08; // Reduced subharmonic
      break;

    case "crystal_bowl":
      // Crystal bowl - brighter, more sine waves with some sawtooth for brilliance
      primaryOsc.type = "sine";
      harmonicOsc.type = Math.random() < 0.3 ? "sawtooth" : "sine";
      secondHarmonicOsc.type = "sine";
      thirdHarmonicOsc.type = Math.random() < 0.4 ? "triangle" : "sine";
      fourthHarmonicOsc.type = "sine";
      subharmonicOsc.type = "sine";

      // Higher harmonic ratios for crystal-like sound
      harmonicRatio = [2.0, 2.5, 3.0][Math.floor(Math.random() * 3)];
      secondHarmonicRatio = [3.5, 4.0, 4.5][Math.floor(Math.random() * 3)];
      thirdHarmonicRatio = [5.0, 6.0, 7.0][Math.floor(Math.random() * 3)];
      fourthHarmonicRatio = [8.0, 9.0, 10.0][Math.floor(Math.random() * 3)];

      // Faster attack, longer sustain for crystal bowls
      attackTime = 0.05 + Math.random() * 0.1;
      decayTime = 0.4 + Math.random() * 0.5;
      sustainLevel = 0.3 + Math.random() * 0.2;
      releaseTime = 5.0 + Math.random() * 6.0;

      // Faster modulation for crystal shimmer
      modulatorOsc.type = "sine";
      modulatorOsc.frequency.value = 4 + Math.random() * 3;
      modulatorGain.gain.value = 0.06 + Math.random() * 0.125; // Further reduced modulation

      // Less subharmonic for brighter sound
      subharmonicOsc.frequency.value = baseFrequency * 0.5;
      subharmonicGain.gain.value = 0.015 + Math.random() * 0.015; // Further reduced subharmonic
      break;

    case "gong":
      // Gong - more complex with some square and sawtooth components
      primaryOsc.type = Math.random() < 0.6 ? "sine" : "triangle";
      harmonicOsc.type = Math.random() < 0.4 ? "sawtooth" : "sine";
      secondHarmonicOsc.type = Math.random() < 0.3 ? "square" : "triangle";
      thirdHarmonicOsc.type = "sine";
      fourthHarmonicOsc.type = Math.random() < 0.5 ? "sawtooth" : "sine";
      subharmonicOsc.type = "sine";

    // case "didgeridoo":
    //   // Didgeridoo - deep resonant drone with characteristic wavering
    //   primaryOsc.type = "sawtooth"; // Rich harmonic content
    //   harmonicOsc.type = "square"; // For buzzy texture
    //   secondHarmonicOsc.type = "sawtooth";
    //   thirdHarmonicOsc.type = "sine"; // Smoother high harmonics
    //   fourthHarmonicOsc.type = "sine";
    //   subharmonicOsc.type = "triangle";

    // // Didgeridoo has strong fundamental with specific overtone structure
    // harmonicRatio = 2.0 + Math.random() * 0.05; // Octave
    // secondHarmonicRatio = 3.0 + Math.random() * 0.05; // Perfect fifth above octave
    // thirdHarmonicRatio = 4.0 + Math.random() * 0.05; // Two octaves
    // fourthHarmonicRatio = 5.0 + Math.random() * 0.05; // Major third above two octaves

    // // Slower attack, long sustain for drone-like quality
    // attackTime = 0.2 + Math.random() * 0.2;
    // decayTime = 0.5 + Math.random() * 0.3;
    // sustainLevel = 0.3 + Math.random() * 0.1;
    // releaseTime = 3.0 + Math.random() * 2.0;

    // // Characteristic rhythmic wavering/pulsing of didgeridoo
    // modulatorOsc.type = "triangle";
    // modulatorOsc.frequency.value = 3.5 + Math.random() * 1.5; // Faster modulation for didgeridoo pulsing
    // modulatorGain.gain.value = 0.1 + Math.random() * 0.1; // Stronger modulation for characteristic wavering

    // // Strong subharmonic for didgeridoo's deep resonance
    // subharmonicOsc.frequency.value = baseFrequency * 0.5;
    // subharmonicGain.gain.value = 0.1 + Math.random() * 0.1; // Stronger subharmonic for depth
    // break;

    case "gong":
      // Gong - more complex with some square and sawtooth components
      primaryOsc.type = Math.random() < 0.6 ? "sine" : "triangle";
      harmonicOsc.type = Math.random() < 0.4 ? "sawtooth" : "sine";
      secondHarmonicOsc.type = Math.random() < 0.3 ? "square" : "triangle";
      thirdHarmonicOsc.type = "sine";
      fourthHarmonicOsc.type = Math.random() < 0.5 ? "sawtooth" : "sine";
      subharmonicOsc.type = "sine";

      // Non-harmonic ratios for gong-like inharmonicity
      harmonicRatio = [1.41, 1.73, 1.93][Math.floor(Math.random() * 3)];
      secondHarmonicRatio = [2.33, 2.76, 3.17][Math.floor(Math.random() * 3)];
      thirdHarmonicRatio = [3.89, 4.21, 4.76][Math.floor(Math.random() * 3)];
      fourthHarmonicRatio = [5.13, 6.48, 7.24][Math.floor(Math.random() * 3)];

      // Faster attack, complex decay for gong
      attackTime = 0.03 + Math.random() * 0.08;
      decayTime = 0.8 + Math.random() * 1.2;
      sustainLevel = 0.15 + Math.random() * 0.1;
      releaseTime = 6.0 + Math.random() * 4.0;

      // More intense modulation for gong vibrato
      modulatorOsc.type = Math.random() < 0.5 ? "sine" : "triangle";
      modulatorOsc.frequency.value = 5 + Math.random() * 4;
      modulatorGain.gain.value = 0.15 + Math.random() * 0.3; // Further reduced modulation

      // Stronger subharmonic for gong depth
      subharmonicOsc.frequency.value = baseFrequency * 0.33;
      subharmonicGain.gain.value = 0.075 + Math.random() * 0.05; // Further reduced subharmonic
      break;

    case "bell":
      // Bell - sharper attack, more inharmonic content
      primaryOsc.type = Math.random() < 0.5 ? "sine" : "triangle";
      harmonicOsc.type = Math.random() < 0.6 ? "triangle" : "sine";
      secondHarmonicOsc.type = Math.random() < 0.4 ? "sawtooth" : "triangle";
      thirdHarmonicOsc.type = "triangle";
      fourthHarmonicOsc.type = Math.random() < 0.3 ? "square" : "triangle";
      subharmonicOsc.type = "sine";

      // Bell-like inharmonic ratios
      harmonicRatio = [2.0, 2.76, 3.0][Math.floor(Math.random() * 3)];
      secondHarmonicRatio = [4.1, 5.2, 5.8][Math.floor(Math.random() * 3)];
      thirdHarmonicRatio = [6.5, 7.2, 8.4][Math.floor(Math.random() * 3)];
      fourthHarmonicRatio = [9.2, 10.5, 12.0][Math.floor(Math.random() * 3)];

      // Sharp attack, faster decay for bell
      attackTime = 0.01 + Math.random() * 0.04;
      decayTime = 0.3 + Math.random() * 0.4;
      sustainLevel = 0.1 + Math.random() * 0.1;
      releaseTime = 3.0 + Math.random() * 2.0;

      // Minimal modulation for bell clarity
      modulatorOsc.type = "sine";
      modulatorOsc.frequency.value = 1 + Math.random() * 1;
      modulatorGain.gain.value = 0.03 + Math.random() * 0.06; // Further reduced modulation

      // Less subharmonic for bell brightness
      subharmonicOsc.frequency.value = baseFrequency * 0.5;
      subharmonicGain.gain.value = 0.015 + Math.random() * 0.015; // Further reduced subharmonic
      break;

    case "water_chime":
      // Water chime - fluid, flowing sound with frequency sweeps
      primaryOsc.type = "sine";
      harmonicOsc.type = "sine";
      secondHarmonicOsc.type = Math.random() < 0.7 ? "sine" : "triangle";
      thirdHarmonicOsc.type = "sine";
      fourthHarmonicOsc.type = "sine";
      subharmonicOsc.type = "sine";

      // Closely-spaced harmonics for water-like beating
      harmonicRatio = [1.02, 1.5, 2.01][Math.floor(Math.random() * 3)];
      secondHarmonicRatio = [2.02, 2.5, 3.01][Math.floor(Math.random() * 3)];
      thirdHarmonicRatio = [3.02, 3.5, 4.01][Math.floor(Math.random() * 3)];
      fourthHarmonicRatio = [4.02, 4.5, 5.01][Math.floor(Math.random() * 3)];

      // Gentle, flowing envelope
      attackTime = 0.2 + Math.random() * 0.3;
      decayTime = 0.5 + Math.random() * 0.5;
      sustainLevel = 0.25 + Math.random() * 0.15;
      releaseTime = 4.0 + Math.random() * 3.0;

      // Flowing modulation for water effect
      modulatorOsc.type = "sine";
      modulatorOsc.frequency.value = 3 + Math.random() * 2;
      modulatorGain.gain.value = 0.175 + Math.random() * 0.225; // Further reduced modulation

      // Moderate subharmonic
      subharmonicOsc.frequency.value = baseFrequency * 0.5;
      subharmonicGain.gain.value = 0.045 + Math.random() * 0.03; // Further reduced subharmonic
      break;

    default: // Fallback to singing bowl
      primaryOsc.type = "sine";
      harmonicOsc.type = "sine";
      secondHarmonicOsc.type = Math.random() < 0.7 ? "sine" : "triangle";
      thirdHarmonicOsc.type = "sine";
      fourthHarmonicOsc.type = "sine";
      subharmonicOsc.type = "sine";

      harmonicRatio = [1.5, 1.78, 2.0][Math.floor(Math.random() * 3)];
      secondHarmonicRatio = [2.67, 3.0, 3.33][Math.floor(Math.random() * 3)];
      thirdHarmonicRatio = [4.0, 4.5, 5.0][Math.floor(Math.random() * 3)];
      fourthHarmonicRatio = [6.0, 7.0, 8.0][Math.floor(Math.random() * 3)];

      attackTime = 0.08 + Math.random() * 0.2;
      decayTime = 0.6 + Math.random() * 0.8;
      sustainLevel = 0.2 + Math.random() * 0.15;
      releaseTime = 4.0 + Math.random() * 5.0;

      modulatorOsc.type = "sine";
      modulatorOsc.frequency.value = 2 + Math.random() * 2;
      modulatorGain.gain.value = 0.1 + Math.random() * 0.25; // Further reduced modulation

      subharmonicOsc.frequency.value = baseFrequency * 0.5;
      subharmonicGain.gain.value = 0.05 + Math.random() * 0.035; // Further reduced subharmonic
  }

  // Set the primary frequency
  primaryOsc.frequency.value = baseFrequency;

  harmonicOsc.frequency.value = baseFrequency * harmonicRatio;
  secondHarmonicOsc.frequency.value = baseFrequency * secondHarmonicRatio;
  thirdHarmonicOsc.frequency.value = baseFrequency * thirdHarmonicRatio;
  fourthHarmonicOsc.frequency.value = baseFrequency * fourthHarmonicRatio;

  // Set harmonic gains based on sound profile
  switch (soundProfile) {
    case "brain_wave":
      harmonicGain.gain.value = 0.125 + Math.random() * 0.075; // Further reduced first harmonic
      secondHarmonicGain.gain.value = 0.09 + Math.random() * 0.05; // Further reduced second harmonic
      thirdHarmonicGain.gain.value = 0.06 + Math.random() * 0.03; // Further reduced third harmonic
      fourthHarmonicGain.gain.value = 0.03 + Math.random() * 0.015; // Further reduced fourth harmonic
      break;

    case "singing_bowl":
      harmonicGain.gain.value = 0.075 + Math.random() * 0.035; // Further reduced
      secondHarmonicGain.gain.value = 0.045 + Math.random() * 0.025; // Further reduced
      thirdHarmonicGain.gain.value = 0.025 + Math.random() * 0.015; // Further reduced
      fourthHarmonicGain.gain.value = 0.0125 + Math.random() * 0.0075; // Further reduced
      break;

    case "crystal_bowl":
      harmonicGain.gain.value = 0.1 + Math.random() * 0.05; // Further reduced
      secondHarmonicGain.gain.value = 0.075 + Math.random() * 0.035; // Further reduced
      thirdHarmonicGain.gain.value = 0.045 + Math.random() * 0.025; // Further reduced
      fourthHarmonicGain.gain.value = 0.025 + Math.random() * 0.015; // Further reduced
      break;

    case "gong":
      harmonicGain.gain.value = 0.06 + Math.random() * 0.04; // Further reduced
      secondHarmonicGain.gain.value = 0.09 + Math.random() * 0.05; // Further reduced
      thirdHarmonicGain.gain.value = 0.06 + Math.random() * 0.04; // Further reduced
      fourthHarmonicGain.gain.value = 0.045 + Math.random() * 0.025; // Further reduced
      break;

    case "bell":
      harmonicGain.gain.value = 0.09 + Math.random() * 0.045; // Further reduced
      secondHarmonicGain.gain.value = 0.12 + Math.random() * 0.06; // Further reduced
      thirdHarmonicGain.gain.value = 0.075 + Math.random() * 0.035; // Further reduced
      fourthHarmonicGain.gain.value = 0.03 + Math.random() * 0.015; // Further reduced
      break;

    case "church_bell":
      harmonicGain.gain.value = 0.12 + Math.random() * 0.06; // Further reduced first harmonic
      secondHarmonicGain.gain.value = 0.15 + Math.random() * 0.075; // Further reduced second harmonic
      thirdHarmonicGain.gain.value = 0.09 + Math.random() * 0.045; // Further reduced third harmonic
      fourthHarmonicGain.gain.value = 0.045 + Math.random() * 0.03; // Further reduced fourth harmonic
      break;

    case "water_chime":
      harmonicGain.gain.value = 0.06 + Math.random() * 0.03; // Further reduced
      secondHarmonicGain.gain.value = 0.06 + Math.random() * 0.03; // Further reduced
      thirdHarmonicGain.gain.value = 0.045 + Math.random() * 0.0225; // Further reduced
      fourthHarmonicGain.gain.value = 0.03 + Math.random() * 0.015; // Further reduced
      break;

    // case "didgeridoo":
    //   harmonicGain.gain.value = 0.12 + Math.random() * 0.06; // Strong first harmonic
    //   secondHarmonicGain.gain.value = 0.09 + Math.random() * 0.04; // Moderate second harmonic
    //   thirdHarmonicGain.gain.value = 0.06 + Math.random() * 0.03; // Subtle third harmonic
    //   fourthHarmonicGain.gain.value = 0.03 + Math.random() * 0.015; // Very subtle fourth harmonic
    //   break;

    default: // Fallback to singing bowl
      harmonicGain.gain.value = 0.15 + Math.random() * 0.07; // Reduced
      secondHarmonicGain.gain.value = 0.09 + Math.random() * 0.05; // Reduced
      thirdHarmonicGain.gain.value = 0.05 + Math.random() * 0.03; // Reduced
      fourthHarmonicGain.gain.value = 0.025 + Math.random() * 0.015; // Reduced
  }

  // Add detune based on sound profile for more natural sound and beating patterns
  switch (soundProfile) {
    case "brain_wave":
      // Minimal detune for brain wave - creates beating patterns at brain wave frequencies
      primaryOsc.detune.value = Math.random() * 4 - 2; // Very minimal detune
      harmonicOsc.detune.value = Math.random() * 8 - 4; // Slight detune for binaural beat effect
      secondHarmonicOsc.detune.value = Math.random() * 12 - 6;
      thirdHarmonicOsc.detune.value = Math.random() * 16 - 8;
      fourthHarmonicOsc.detune.value = Math.random() * 20 - 10;
      break;

    case "singing_bowl":
      primaryOsc.detune.value = Math.random() * 10 - 5; // -5 to 5 cents
      harmonicOsc.detune.value = Math.random() * 25 - 12.5;
      secondHarmonicOsc.detune.value = Math.random() * 30 - 15;
      thirdHarmonicOsc.detune.value = Math.random() * 35 - 17.5;
      fourthHarmonicOsc.detune.value = Math.random() * 40 - 20;
      break;

    case "crystal_bowl":
      primaryOsc.detune.value = Math.random() * 15 - 7.5;
      harmonicOsc.detune.value = Math.random() * 30 - 15;
      secondHarmonicOsc.detune.value = Math.random() * 40 - 20;
      thirdHarmonicOsc.detune.value = Math.random() * 50 - 25;
      fourthHarmonicOsc.detune.value = Math.random() * 60 - 30;
      break;

    case "gong":
      primaryOsc.detune.value = Math.random() * 20 - 10;
      harmonicOsc.detune.value = Math.random() * 40 - 20;
      secondHarmonicOsc.detune.value = Math.random() * 60 - 30;
      thirdHarmonicOsc.detune.value = Math.random() * 80 - 40;
      fourthHarmonicOsc.detune.value = Math.random() * 100 - 50;
      break;

    case "bell":
      primaryOsc.detune.value = Math.random() * 5 - 2.5; // Less detune for clarity
      harmonicOsc.detune.value = Math.random() * 15 - 7.5;
      secondHarmonicOsc.detune.value = Math.random() * 20 - 10;
      thirdHarmonicOsc.detune.value = Math.random() * 25 - 12.5;
      fourthHarmonicOsc.detune.value = Math.random() * 30 - 15;
      break;

    case "church_bell":
      primaryOsc.detune.value = Math.random() * 3 - 1.5; // Minimal detune for clarity
      harmonicOsc.detune.value = Math.random() * 10 - 5; // Slight detune for natural sound
      secondHarmonicOsc.detune.value = Math.random() * 15 - 7.5;
      thirdHarmonicOsc.detune.value = Math.random() * 20 - 10;
      fourthHarmonicOsc.detune.value = Math.random() * 25 - 12.5;
      break;

    case "water_chime":
      primaryOsc.detune.value = Math.random() * 30 - 15; // More detune for water effect
      harmonicOsc.detune.value = Math.random() * 50 - 25;
      secondHarmonicOsc.detune.value = Math.random() * 70 - 35;
      thirdHarmonicOsc.detune.value = Math.random() * 90 - 45;
      fourthHarmonicOsc.detune.value = Math.random() * 110 - 55;
      break;

    default: // Fallback to singing bowl
      primaryOsc.detune.value = Math.random() * 10 - 5;
      harmonicOsc.detune.value = Math.random() * 25 - 12.5;
      secondHarmonicOsc.detune.value = Math.random() * 30 - 15;
      thirdHarmonicOsc.detune.value = Math.random() * 35 - 17.5;
      fourthHarmonicOsc.detune.value = Math.random() * 40 - 20;
  }

  // Set envelope based on the selected sound profile
  const now = audioContext.currentTime;

  // Volume envelope with more nuanced curve based on sound profile
  gainNode.gain.setValueAtTime(0, now);

  // Adjust envelope characteristics based on sound profile
  switch (soundProfile) {
    case "brain_wave":
      // Brain waves have very gradual attack and extremely long release
      gainNode.gain.linearRampToValueAtTime(0.3, now + attackTime); // Gentle rise
      gainNode.gain.setTargetAtTime(
        sustainLevel,
        now + attackTime,
        decayTime * 0.8
      ); // Very slow decay
      gainNode.gain.setTargetAtTime(
        0.001,
        now + attackTime + decayTime,
        releaseTime * 0.9
      ); // Extremely long fade

      // Smooth filter envelope for brain wave
      filterNode.frequency.setValueAtTime(300, now);
      filterNode.frequency.linearRampToValueAtTime(600, now + attackTime * 1.5); // Very slow rise
      filterNode.frequency.exponentialRampToValueAtTime(
        200,
        now + attackTime + decayTime * 3
      ); // Very slow fall

      // Extensive reverb for brain wave immersion
      reverbNode.gain.setValueAtTime(1.8, now); // Strong reverb
      reverbNode.gain.setTargetAtTime(
        0.001,
        now + attackTime + decayTime,
        releaseTime * 0.95
      ); // Very long reverb tail
      break;

    case "church_bell":
      // Church bells have a sharp attack and a long, gradual decay
      gainNode.gain.linearRampToValueAtTime(0.5, now + attackTime); // Higher initial volume
      gainNode.gain.setTargetAtTime(
        sustainLevel,
        now + attackTime,
        decayTime * 0.3
      ); // Faster initial decay
      break;

    case "singing_bowl":
      gainNode.gain.linearRampToValueAtTime(0.35, now + attackTime);
      gainNode.gain.setTargetAtTime(
        sustainLevel,
        now + attackTime,
        decayTime * 0.5
      );
      gainNode.gain.setTargetAtTime(
        0.001,
        now + attackTime + decayTime,
        releaseTime * 0.4
      );

      // Filter envelope for singing bowl
      filterNode.frequency.setValueAtTime(800, now);
      filterNode.frequency.linearRampToValueAtTime(
        1500,
        now + attackTime * 0.8
      );
      filterNode.frequency.exponentialRampToValueAtTime(
        800,
        now + attackTime + decayTime * 2
      );

      // Reverb settings
      reverbNode.gain.setValueAtTime(1, now);
      reverbNode.gain.setTargetAtTime(
        0.001,
        now + attackTime + decayTime,
        releaseTime * 0.6
      );
      break;

    case "crystal_bowl":
      gainNode.gain.linearRampToValueAtTime(0.4, now + attackTime);
      gainNode.gain.setTargetAtTime(
        sustainLevel,
        now + attackTime,
        decayTime * 0.3
      );
      gainNode.gain.setTargetAtTime(
        0.001,
        now + attackTime + decayTime,
        releaseTime * 0.5
      );

      // Brighter filter envelope for crystal bowl
      filterNode.frequency.setValueAtTime(1200, now);
      filterNode.frequency.linearRampToValueAtTime(
        2000,
        now + attackTime * 0.5
      );
      filterNode.frequency.exponentialRampToValueAtTime(
        1000,
        now + attackTime + decayTime * 1.5
      );

      // More reverb for crystal bowl
      reverbNode.gain.setValueAtTime(1.2, now);
      reverbNode.gain.setTargetAtTime(
        0.001,
        now + attackTime + decayTime,
        releaseTime * 0.7
      );
      break;

    case "gong":
      gainNode.gain.linearRampToValueAtTime(0.5, now + attackTime); // Louder strike
      gainNode.gain.setTargetAtTime(
        sustainLevel,
        now + attackTime,
        decayTime * 0.7
      ); // Slower initial decay
      gainNode.gain.setTargetAtTime(
        0.001,
        now + attackTime + decayTime,
        releaseTime * 0.6
      ); // Longer fade

      // Complex filter envelope for gong
      filterNode.frequency.setValueAtTime(600, now);
      filterNode.frequency.linearRampToValueAtTime(
        1800,
        now + attackTime * 0.3
      ); // Faster rise
      filterNode.frequency.exponentialRampToValueAtTime(
        400,
        now + attackTime + decayTime * 3
      ); // Slower fall

      // Heavy reverb for gong
      reverbNode.gain.setValueAtTime(1.5, now);
      reverbNode.gain.setTargetAtTime(
        0.001,
        now + attackTime + decayTime,
        releaseTime * 0.8
      );
      break;

    case "bell":
      gainNode.gain.linearRampToValueAtTime(0.45, now + attackTime); // Sharp attack
      gainNode.gain.setTargetAtTime(
        sustainLevel,
        now + attackTime,
        decayTime * 0.2
      ); // Quick decay
      gainNode.gain.setTargetAtTime(
        0.001,
        now + attackTime + decayTime,
        releaseTime * 0.3
      ); // Moderate fade

      // Bright filter envelope for bell
      filterNode.frequency.setValueAtTime(1500, now);
      filterNode.frequency.linearRampToValueAtTime(
        3000,
        now + attackTime * 0.2
      ); // Very fast rise
      filterNode.frequency.exponentialRampToValueAtTime(
        1000,
        now + attackTime + decayTime
      );

      // Moderate reverb for bell
      reverbNode.gain.setValueAtTime(0.8, now);
      reverbNode.gain.setTargetAtTime(
        0.001,
        now + attackTime + decayTime,
        releaseTime * 0.4
      );
      break;

    case "water_chime":
      gainNode.gain.linearRampToValueAtTime(0.3, now + attackTime); // Gentle attack
      gainNode.gain.setTargetAtTime(
        sustainLevel,
        now + attackTime,
        decayTime * 0.6
      ); // Flowing decay
      gainNode.gain.setTargetAtTime(
        0.001,
        now + attackTime + decayTime,
        releaseTime * 0.5
      ); // Smooth fade

      // Flowing filter envelope for water effect
      filterNode.frequency.setValueAtTime(1000, now);
      filterNode.frequency.linearRampToValueAtTime(1800, now + attackTime);
      filterNode.frequency.exponentialRampToValueAtTime(
        600,
        now + attackTime + decayTime * 2.5
      );

      // Shimmering reverb for water
      reverbNode.gain.setValueAtTime(1.3, now);
      reverbNode.gain.setTargetAtTime(
        0.001,
        now + attackTime + decayTime,
        releaseTime * 0.7
      );
      break;

    default: // Fallback to singing bowl
      gainNode.gain.linearRampToValueAtTime(0.35, now + attackTime);
      gainNode.gain.setTargetAtTime(
        sustainLevel,
        now + attackTime,
        decayTime * 0.5
      );
      gainNode.gain.setTargetAtTime(
        0.001,
        now + attackTime + decayTime,
        releaseTime * 0.4
      );

      filterNode.frequency.setValueAtTime(800, now);
      filterNode.frequency.linearRampToValueAtTime(
        1500,
        now + attackTime * 0.8
      );
      filterNode.frequency.exponentialRampToValueAtTime(
        800,
        now + attackTime + decayTime * 2
      );

      reverbNode.gain.setValueAtTime(1, now);
      reverbNode.gain.setTargetAtTime(
        0.001,
        now + attackTime + decayTime,
        releaseTime * 0.6
      );
  }

  // Start and stop oscillators with slight timing variations for more natural sound
  primaryOsc.start(now);
  // Slight delay between oscillator starts creates more natural attack
  harmonicOsc.start(now + 0.01);
  secondHarmonicOsc.start(now + 0.02);
  thirdHarmonicOsc.start(now + 0.03);
  fourthHarmonicOsc.start(now + 0.04);
  subharmonicOsc.start(now + 0.01);
  modulatorOsc.start(now);

  // Extended stop time for longer resonance
  const stopTime = now + attackTime + decayTime + releaseTime + 2.5;
  primaryOsc.stop(stopTime);
  harmonicOsc.stop(stopTime + 0.1); // Staggered stops for more natural decay
  secondHarmonicOsc.stop(stopTime + 0.2);
  thirdHarmonicOsc.stop(stopTime + 0.3);
  fourthHarmonicOsc.stop(stopTime + 0.4);
  subharmonicOsc.stop(stopTime + 0.5);
  modulatorOsc.stop(stopTime);
}
