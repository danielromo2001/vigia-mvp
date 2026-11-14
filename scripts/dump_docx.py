import sys
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from docx.oxml.ns import qn


def iter_block_items(parent):
    body = parent.element.body
    for child in body.iterchildren():
        if child.tag == qn("w:p"):
            yield Paragraph(child, parent)
        elif child.tag == qn("w:tbl"):
            yield Table(child, parent)


def main(path: str, out: str) -> None:
    doc = Document(path)
    lines = []
    for block in iter_block_items(doc):
        if isinstance(block, Paragraph):
            text = block.text.strip()
            if text:
                style = block.style.name if block.style is not None else ""
                prefix = f"[{style}] " if style and style.lower() not in ("normal", "body text") else ""
                lines.append(prefix + text)
        else:
            lines.append("")
            for row in block.rows:
                cells = []
                for cell in row.cells:
                    cells.append(" ".join(p.text.strip() for p in cell.paragraphs if p.text.strip()))
                lines.append("| " + " | ".join(cells) + " |")
            lines.append("")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))
    print(f"OK {out} ({len(lines)} lines)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
