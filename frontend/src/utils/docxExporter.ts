import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  convertMillimetersToTwip,
} from 'docx';
import type { A4FormTemplate } from '../data/a4FormTemplates';

/**
 * Remove Vietnamese accents and special characters for a clean file name
 */
const sanitizeFileName = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

/**
 * Generate and trigger download of a genuine .docx file conforming to Decree 30/2020/ND-CP
 */
export async function exportA4TemplateToDocx(
  template: A4FormTemplate,
  wardName: string,
  _initialData: Record<string, string> = {}
): Promise<void> {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const isPolice = template.agencyType === 'POLICE';
  const agencyLine1 = isPolice ? 'CÔNG AN TỈNH AN GIANG' : 'ỦY BAN NHÂN DÂN TỈNH AN GIANG';
  const agencyLine2 = isPolice
    ? `CÔNG AN ${wardName.toUpperCase()}`
    : `UBND ${wardName.toUpperCase()}`;

  const borderNone = { style: BorderStyle.NONE, size: 0, color: 'auto' };
  const noBorders = {
    top: borderNone,
    bottom: borderNone,
    left: borderNone,
    right: borderNone,
    insideHorizontal: borderNone,
    insideVertical: borderNone,
  };

  // Build body paragraphs from sections
  const bodyParagraphs: Paragraph[] = [];

  // Title block
  bodyParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 60 },
      children: [
        new TextRun({
          text: template.title,
          bold: true,
          size: 30, // 15pt
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `${template.legalNote} [${template.formCode}]`,
          italics: true,
          size: 22, // 11pt
          font: 'Times New Roman',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 240 },
      children: [
        new TextRun({
          text: 'Kính gửi: ',
          bold: true,
          italics: true,
          size: 26, // 13pt
          font: 'Times New Roman',
        }),
        new TextRun({
          text: template.recipient.replace('{WARD_NAME}', wardName),
          bold: true,
          size: 26, // 13pt
          font: 'Times New Roman',
        }),
      ],
    })
  );

  // Sections
  for (const section of template.sections) {
    if (section.title) {
      bodyParagraphs.push(
        new Paragraph({
          spacing: { before: 200, after: 80 },
          children: [
            new TextRun({
              text: section.title,
              bold: true,
              size: 24, // 12pt
              font: 'Times New Roman',
            }),
          ],
        })
      );
    }

    for (const field of section.fields) {
      if (field.type === 'grid2' && field.secondLabel) {
        bodyParagraphs.push(
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: `${field.label}: `, size: 24, font: 'Times New Roman' }),
              new TextRun({
                text: '........................................................',
                bold: false,
                size: 24,
                font: 'Times New Roman',
              }),
              new TextRun({ text: '        ', size: 24, font: 'Times New Roman' }),
              new TextRun({ text: `${field.secondLabel}: `, size: 24, font: 'Times New Roman' }),
              new TextRun({
                text: '........................................................',
                bold: false,
                size: 24,
                font: 'Times New Roman',
              }),
            ],
          })
        );
      } else {
        bodyParagraphs.push(
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: `${field.label}: `, size: 24, font: 'Times New Roman' }),
              new TextRun({
                text: '...........................................................................................................',
                bold: false,
                size: 24,
                font: 'Times New Roman',
              }),
            ],
          })
        );
      }
    }
  }

  // Commitment text
  bodyParagraphs.push(
    new Paragraph({
      spacing: { before: 240, after: 200 },
      children: [
        new TextRun({
          text: template.commitText,
          italics: true,
          size: 22, // 11pt
          font: 'Times New Roman',
        }),
      ],
    })
  );

  // Signatures Table
  const sigLeft = template.signatures?.[0] || { role: 'CÁN BỘ TIẾP NHẬN', note: '(Ký, ghi rõ họ tên)' };
  const sigRight = template.signatures?.[1] || { role: 'NGƯỜI KÊ KHAI LÀM ĐƠN', note: '(Ký và ghi rõ họ tên)' };

  const signaturesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: sigLeft.role, bold: true, size: 24, font: 'Times New Roman' })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: sigLeft.note, italics: true, size: 20, font: 'Times New Roman' })],
              }),
              new Paragraph({ spacing: { before: 1400 } }), // Signature blank space
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: sigRight.role, bold: true, size: 24, font: 'Times New Roman' })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: sigRight.note, italics: true, size: 20, font: 'Times New Roman' })],
              }),
              new Paragraph({ spacing: { before: 1400 } }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: '',
                    bold: true,
                    size: 24,
                    font: 'Times New Roman',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Construct Document
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Times New Roman',
            size: 26, // 13pt
            color: '000000',
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(210),
              height: convertMillimetersToTwip(297),
            },
            margin: {
              top: convertMillimetersToTwip(20),
              bottom: convertMillimetersToTwip(20),
              left: convertMillimetersToTwip(25),
              right: convertMillimetersToTwip(15),
            },
          },
        },
        children: [
          // Header Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: agencyLine1, size: 22, font: 'Times New Roman' })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: agencyLine2, bold: true, size: 24, font: 'Times New Roman' })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '-----------------------', size: 18, font: 'Times New Roman' })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: `Mã TTHC: ${template.procedureCode}`,
                            italics: true,
                            size: 20,
                            font: 'Times New Roman',
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 55, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                            bold: true,
                            size: 24,
                            font: 'Times New Roman',
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'Độc lập - Tự do - Hạnh phúc',
                            bold: true,
                            size: 26,
                            font: 'Times New Roman',
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: '--------------------------------',
                            size: 20,
                            font: 'Times New Roman',
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({
                            text: `${wardName}, ngày ${day} tháng ${month} năm ${year}`,
                            italics: true,
                            size: 22,
                            font: 'Times New Roman',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Body Content
          ...bodyParagraphs,

          // Signatures
          signaturesTable,
        ],
      },
    ],
  });

  // Pack to Blob and Trigger Download
  const blob = await Packer.toBlob(doc);
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  const fileName = `${template.procedureCode}_PHOI_MAU_TRANG_${sanitizeFileName(template.title)}.docx`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
