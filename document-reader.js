window.DocumentReader = (() => {
  const extensionOf = (name) => name.split(".").pop().toLowerCase();
  const normalize = (text) => text.replace(/\s+/g, " ").trim();
  const readTextFile = (file) => file.text();

  async function readPdf(file) {
    if (!window.pdfjsLib) throw new Error("The PDF reader did not load. Check your internet connection and try again.");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).join(" "));
    }
    return pages.join(" ");
  }

  const xmlText = (xml) => {
    const document = new DOMParser().parseFromString(xml, "application/xml");
    return [...document.getElementsByTagNameNS("*", "t")].map((node) => node.textContent).join(" ");
  };
  const numericSlideOrder = (a, b) => Number(a.match(/slide(\d+)\.xml$/)?.[1]) - Number(b.match(/slide(\d+)\.xml$/)?.[1]);

  async function readOfficeFile(file, extension) {
    if (!window.JSZip) throw new Error("The Office document reader did not load. Check your internet connection and try again.");
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const paths = extension === "docx"
      ? ["word/document.xml"]
      : Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path)).sort(numericSlideOrder);
    if (!paths.length) throw new Error("This Office file does not contain readable document text.");
    return (await Promise.all(paths.map(async (path) => xmlText(await zip.file(path).async("text"))))).join(" ");
  }

  async function extractText(file) {
    const extension = extensionOf(file.name);
    if (["txt", "md", "csv", "json", "html", "htm", "xml"].includes(extension)) return normalize(await readTextFile(file));
    if (extension === "pdf") return normalize(await readPdf(file));
    if (["docx", "pptx"].includes(extension)) return normalize(await readOfficeFile(file, extension));
    if (["doc", "ppt"].includes(extension)) throw new Error(`Please save this older .${extension} file as .${extension}x, then upload it again.`);
    throw new Error("Unsupported file type. Upload PDF, DOCX, PPTX, or a text-based notes file.");
  }

  return { extractText };
})();
