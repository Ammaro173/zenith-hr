import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export type GeneratePdfParams = {
  requestCode: string;
  positionTitle: string;
  salary: number;
  currency: string;
  candidateName: string;
  candidateEmail: string;
  candidateAddress?: string;
  startDate: string;
};

export class PdfService {
  async generateContractPdf(params: GeneratePdfParams): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const fontSize = 12;
    const lineHeight = 14;
    let y = height - 50;

    const drawText = (text: string) => {
      page.drawText(text, {
        x: 50,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    };

    drawText("EMPLOYMENT CONTRACT");
    y -= lineHeight;
    drawText(`Request Code: ${params.requestCode}`);
    drawText(`Position: ${params.positionTitle}`);
    drawText(`Start Date: ${params.startDate}`);
    y -= lineHeight;
    drawText(`Candidate: ${params.candidateName}`);
    drawText(`Email: ${params.candidateEmail}`);
    if (params.candidateAddress) {
      drawText(`Address: ${params.candidateAddress}`);
    }
    y -= lineHeight;
    drawText("Compensation:");
    drawText(`Salary: ${params.salary} ${params.currency}`);

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
