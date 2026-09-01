# Darkroom — Technical Case Study & Architecture

A frontend thesis project exploring digital archives through the physics and ritual of a physical photographic darkroom under red safelight.

---

## 1. Thesis & Concept

Most digital interfaces treat content as instantly accessible and disposable. **Darkroom** is an experiment in the opposite direction: **patience, progressive reveal, and tactile friction as design values.**

Content starts undeveloped — blank, latent silver halide emulsion on paper. Visitors must actively engage through pointer agitation (swirling chemicals) or dwell focus (patience) to develop prints, sketches, and negatives. 

Stepping into the room lights via the **Daylight Switch** instantly fixes and exposes all prints at once, mirroring the physical darkroom transition from chemical development to finished exhibition.

---

## 2. Core Architecture

### A. Single Shared WebGL Pipeline & Priority Queue
- Rather than instantiating dozens of WebGL contexts (which causes browser context loss and memory thrashing), Darkroom uses a **single shared offscreen WebGL renderer**.
- A central priority queue in `src/develop.js` dispatches draw passes based on viewport visibility and pointer interaction recency.
- Shaders compute chemical development, liquid ripple distortions, silver halide grain noise, and ambient exposure maps in real time.

### B. Clothesline Physics (Mass-Spring-Damper)
- The landing clothesline in `src/clothesline.js` implements a real-time mass-spring-damper physics model.
- Each hanging print sways dynamically with gravitational damping, mouse movement turbulence, and mobile scroll velocity impulses.

### C. Tiered Development Constraints
Content is organized into distinct chemical development tiers:
- **Tier 1 (Finished Prints / Active Works)**: Develops to 100% exposure (`cap = 1.0`). Supports high-res photography and video/procedural canvas simulations.
- **Tier 2 (Contact Sheets / In-Progress Studies)**: Capped at midtones (`cap = 0.75`), presenting early interaction sketches and prototypes.
- **Tier 3 (Negatives / Discarded Hypotheses)**: Capped at shadows (`cap = 0.45`), housed in faux film-strip frames with explicit rationale for why the work was stopped.
- **Tier 4 (The Latent Image)**: Plain typewriter text questions that remain undeveloped (`—` placeholders) in Safelight mode and reveal answers only upon switching to Daylight mode.

---

## 3. Performance & Optimization

- **Zero Runtime Dependencies**: Built entirely with Vite, vanilla ES modules, vanilla CSS, and raw WebGL shaders.
- **Bundle Footprint**: ~39 kB JavaScript bundle (13 kB gzipped) and ~23 kB CSS.
- **Mobile Throttling**: Canvas resolution dynamically scales from 1024×1024 on desktop to 512×512 on mobile viewports (`<= 768px`) to conserve GPU memory and battery.

---

## 4. Live Links
- **Production Site**: [https://darkroom-seven.vercel.app](https://darkroom-seven.vercel.app)
- **Source Repository**: [https://github.com/chukka-venugopalam/Darkroom](https://github.com/chukka-venugopalam/Darkroom)
