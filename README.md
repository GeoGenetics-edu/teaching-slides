# Metagenomics Lecture Slides (NBIB25004U)

Interactive reveal.js slides for the metagenomics course at the University of Copenhagen, Faculty of Health and Medical Sciences.

**Live slides:** https://geogenetics-edu.github.io/teaching-slides/

## Lectures

| Lecture | Topic | Link |
|---------|-------|------|
| 1 | From reads to MAGs | [preprocessing/](https://geogenetics-edu.github.io/teaching-slides/preprocessing/) |
| 2 | From microbial genomes to microbial traits | [mag-characterization/](https://geogenetics-edu.github.io/teaching-slides/mag-characterization/) |

## How to use

Open any lecture link above. Navigate with arrow keys or swipe on mobile. Press `F` for fullscreen, `O` for slide overview, `S` for speaker notes.

## Technical details

Each lecture is a self-contained folder with an `index.html` and a `slides.js` file. Slides use [reveal.js](https://revealjs.com/) 4.6.1 with custom Canvas 2D animations for diagrams and visualisations. No build step is required.

## Local development

```bash
# Serve locally (any static server works)
cd teaching-slides
python3 -m http.server 8080
# Open http://localhost:8080
```

## Course

NBIB25004U Metagenomics, University of Copenhagen, 2026.
