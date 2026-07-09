# Shelf — a markdown reading journal

One markdown file per book in `books/`, one gorgeous static page per book in `dist/`.

## Build

```sh
node build.js   # -> dist/index.html + one page per book
```

No dependencies. Open `dist/index.html` in a browser.

## Adding a book

Create `books/my-book.md`:

```md
---
title: The Book Title
subtitle: An Optional Secondary Title
author: The Author
status: reading        # reading | read
format: audiobook      # audiobook | physical
narrator: Some Narrator   # optional, for audiobooks
---

Your thoughts go here, in plain markdown — headings, **bold**,
*italics*, lists, > blockquotes, and [links](https://example.com).
```

The landing page splits cards into **Currently Reading** and **Read**; each card links to the book's page, which shows status, format, narrator, and your thoughts.
