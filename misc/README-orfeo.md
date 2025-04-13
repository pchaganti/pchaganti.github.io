# Orfeo - Interactive Meditation Experience

Orfeo is a web-based meditation and sound healing experience that creates a peaceful, immersive environment through procedurally generated visuals and audio. The application combines Buddhist-inspired aesthetics with modern web technologies to create a unique, calming experience.

## Overview

Orfeo generates a meditative environment with the following elements:

- **Floating Circles**: Hollow circles with Buddhist-inspired colors (golds, deep reds, blues, purples, teals) appear and disappear in a gentle rhythm
- **Background Particles**: Subtle floating particles create depth and ambient movement
- **Ambient Sound**: A continuous, evolving drone using gamma wave frequencies (30-100 Hz) creates a meditative soundscape
- **Interactive Sound Effects**: Various meditation instruments (singing bowls, temple bells, crystal bowls, gongs) play randomly and when the user interacts with the page

## How It Works

### Visual Elements

#### Circles

The application generates circles with these characteristics:

- Random sizes (30-350 pixels)
- Buddhist-inspired color palette
- Hollow appearance with varied border styles (solid, dashed, dotted)
- Gentle animations (appear-disappear, pulse, rotation)
- Appear at random intervals across the screen

```javascript
function createRandomCircle() {
  // Random size between 30 and 350 pixels
  const size = Math.floor(Math.random() * 320) + 30;
  
  // Random position ensuring circle is fully visible
  const maxX = window.innerWidth - size;
  const maxY = window.innerHeight - size;
  const x = Math.floor(Math.random() * maxX);
  const y = Math.floor(Math.random() * maxY);
  
  // Buddhist-inspired color palette
  const colorPalettes = [
    { hue: 35, saturation: 80, lightness: 65 }, // Gold
    { hue: 0, saturation: 70, lightness: 40 },  // Deep red
    { hue: 270, saturation: 50, lightness: 40 }, // Purple
    { hue: 200, saturation: 60, lightness: 30 }, // Deep blue
    { hue: 160, saturation: 50, lightness: 30 }, // Teal
  ];
  
  // Create and style the circle element
  // ...
}
```

#### Background Particles

Subtle background particles add depth to the experience:

- Density based on screen size
- Gentle floating animation
- Subtle glow effects
- Respond subtly to audio frequencies

### Audio Elements

#### Ambient Background Sound

The continuous ambient sound uses the Web Audio API to create a rich, evolving soundscape:

- Multiple oscillators with varied waveforms (sine, triangle, sawtooth)
- Harmonic relationships between frequencies for musical coherence
- Low-frequency base (40-60 Hz) in the gamma wave range
- Complex modulation system with multiple LFOs (Low Frequency Oscillators)
- Extremely quiet volume levels for subtle background presence
- Filters and effects for a rich, evolving texture

```javascript
function createAmbientSound() {
  // Create a master gain node with very low volume
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 0.005; // Very quiet
  
  // Create multiple oscillators with harmonic relationships
  const baseFrequency = 40 + Math.random() * 5;
  const gammaFrequencies = [
    baseFrequency,
    baseFrequency * 1.5, // Perfect fifth
    baseFrequency * 1.25, // Major third
    baseFrequency * 2, // Octave
    baseFrequency * 0.75, // Perfect fourth below
  ];
  
  // Add complex modulation and filtering
  // ...
}
```

#### Special Sound Effects

Random sound effects play periodically and when the user interacts with the page:

- **Singing Bowl**: Warm, resonant tones with long sustain
- **Temple Bell**: Deep, rich bell sounds with harmonics
- **Crystal Bowl**: Higher, clearer tones with shimmer
- **Gong**: Complex, inharmonic sounds with rich texture
- **Wind Chime**: Delicate, high-frequency sequences
- **Water Chime**: Fluid, rippling sounds

Each sound type has unique characteristics:

```javascript
function playSpecialEffect() {
  const effectTypes = [
    "singing_bowl",
    "crystal_bowl",
    "gong",
    "bell",
    "church_bell",
    "wind_chime",
    "temple_bell",
    "meditation_bowl",
    "water_chime",
    "nature_sound",
  ];
  
  const effectType = effectTypes[Math.floor(Math.random() * effectTypes.length)];
  
  // Configure oscillators, filters, and envelopes based on the effect type
  // ...
}
```

### Interactive Elements

The page responds to user interaction:

- Clicking creates a special circle at the cursor position
- Generates a ripple effect from the click point
- Creates a burst of particles that float outward
- Plays a special sound effect

## Technical Implementation

### CSS Animations

The visual elements use CSS animations for smooth performance:

- `appear-disappear`: Controls the circle lifecycle
- `gentle-pulse`: Creates subtle breathing effect
- `rotate-cw` and `rotate-ccw`: Adds rotation to some circles
- `ripple-effect`: Creates expanding rings
- `float-particle`: Controls the movement of background particles
- `glow-pulse`: Adds subtle lighting effects

### Web Audio API

The sound generation uses the Web Audio API for complex audio synthesis:

- `AudioContext` for managing audio processing
- `OscillatorNode` for generating tones
- `GainNode` for volume control
- `BiquadFilterNode` for frequency filtering
- `DynamicsCompressorNode` for audio dynamics
- Parameter automation for evolving sounds

### Event Handling

- `load` event initializes the audio context and starts the experience
- `resize` event updates background particles for different screen sizes
- `click` event creates interactive effects

## Usage

Simply open the HTML file in a modern web browser. For the best experience:

1. Use a device with good audio capabilities (headphones recommended)
2. Allow the page to run in the foreground
3. Click anywhere on the screen to create interactive effects
4. Relax and enjoy the meditative experience

## Browser Compatibility

Orfeo works best in modern browsers that support the Web Audio API and CSS animations:

- Chrome/Edge (recommended)
- Firefox
- Safari

## Credits

Orfeo was inspired by Buddhist meditation practices, sound healing traditions, and generative art. The audio design draws from singing bowl and gong meditation techniques, while the visual aesthetic references Buddhist iconography and color symbolism.

We could enhance the sound spectrum with several additional sound profiles:

1. Tibetan Singing Bowls : Different sizes and materials (bronze, crystal) with their characteristic overtone series
2. Shakuhachi : Japanese bamboo flute with breathy, meditative tones
3. Tanpura : Indian drone instrument with rich harmonics
4. Shruti Box : Another Indian drone with complex harmonic structure
5. Didgeridoo : Aboriginal instrument with deep resonant tones and overtones
6. Hang/Handpan : Steel percussion with bell-like tones
7. Binaural Beats : Specific frequency differences (1-30Hz) between left and right channels
8. Solfeggio Frequencies : Ancient scale frequencies (396Hz, 417Hz, 528Hz, etc.) with healing properties
9. Himalayan Bowls : Specific metal alloy bowls with unique harmonic profiles
These could be implemented using the Web Audio API with appropriate oscillator types, frequency ratios, and envelope characteristics to simulate each instrument's unique timbre.