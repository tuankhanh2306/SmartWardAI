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
 * Unified 100% with the on-screen "Phôi Mẫu Trắng" and PDF export.
 */
export async function exportA4TemplateToDocx(
  template: A4FormTemplate,
  wardName: string,
  _initialData: Record<string, string> = {}
): Promise<void> {
  const today = new Date();
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

  const borderThin = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const gridBorders = {
    top: borderThin,
    bottom: borderThin,
    left: borderThin,
    right: borderThin,
    insideHorizontal: borderThin,
    insideVertical: borderThin,
  };

  // Build body elements (Paragraphs & Tables)
  const bodyChildren: Array<Paragraph | Table> = [];

  // Title block
  bodyChildren.push(
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
          text: template.recipient.replace(/\{WARD_NAME\}/g, wardName),
          bold: true,
          size: 26, // 13pt
          font: 'Times New Roman',
        }),
      ],
    })
  );

  // Special two-column Bride & Groom layout for TTHC-HT-02 (Đăng ký kết hôn) to match screen & PDF 100%
  if (template.procedureCode === 'TTHC-HT-02') {
    const makePartyCell = (partyTitle: string) =>
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 100 },
            children: [new TextRun({ text: partyTitle, bold: true, size: 24, font: 'Times New Roman' })],
          }),
          ...[
            'Họ, chữ đệm và tên: ........................................',
            'Ngày, tháng, năm sinh: ....../....../..........',
            'Dân tộc: ........................',
            'Quốc tịch: ........................',
            'Số ĐDCN / CCCD: ........................',
            'Nơi cư trú: ........................................................',
            'Kết hôn lần thứ: ........................',
          ].map(
            (line) =>
              new Paragraph({
                spacing: { before: 50, after: 50 },
                children: [new TextRun({ text: line, size: 23, font: 'Times New Roman' })],
              })
          ),
        ],
      });

    bodyChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: gridBorders,
        rows: [
          new TableRow({
            children: [makePartyCell('BÊN NAM'), makePartyCell('BÊN NỮ')],
          }),
        ],
      })
    );
  } else {
    // Standard Sections & Fields
    for (const section of template.sections) {
      if (section.title) {
        bodyChildren.push(
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
          bodyChildren.push(
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
          bodyChildren.push(
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

    // For TTHC-CR-01 (Mẫu CT01), include the 5-column table under Item 11 to match screen & PDF 100%
    if (template.procedureCode === 'TTHC-CR-01') {
      const makeHeaderCell = (text: string, widthPct: number) =>
        new TableCell({
          width: { size: widthPct, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 60 },
              children: [new TextRun({ text, bold: true, size: 22, font: 'Times New Roman' })],
            }),
          ],
        });

      const makeBlankRowCell = (text: string, widthPct: number) =>
        new TableCell({
          width: { size: widthPct, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 80, after: 80 },
              children: [new TextRun({ text, size: 22, font: 'Times New Roman' })],
            }),
          ],
        });

      bodyChildren.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: gridBorders,
          rows: [
            new TableRow({
              children: [
                makeHeaderCell('TT', 8),
                makeHeaderCell('Họ, chữ đệm và tên', 34),
                makeHeaderCell('Ngày, tháng, năm sinh', 20),
                makeHeaderCell('Giới tính', 13),
                makeHeaderCell('Số ĐDCN / CCCD', 25),
              ],
            }),
            new TableRow({
              children: [
                makeBlankRowCell('1', 8),
                makeBlankRowCell('........................', 34),
                makeBlankRowCell('....../....../....', 20),
                makeBlankRowCell('....', 13),
                makeBlankRowCell('........................', 25),
              ],
            }),
            new TableRow({
              children: [
                makeBlankRowCell('2', 8),
                makeBlankRowCell('........................', 34),
                makeBlankRowCell('....../....../....', 20),
                makeBlankRowCell('....', 13),
                makeBlankRowCell('........................', 25),
              ],
            }),
          ],
        })
      );
    }
  }

  // Commitment text
  bodyChildren.push(
    new Paragraph({
      spacing: { before: 240, after: 200 },
      children: [
        new TextRun({
          text: template.commitText.replace(/\{WARD_NAME\}/g, wardName),
          italics: true,
          size: 22, // 11pt
          font: 'Times New Roman',
        }),
      ],
    })
  );

  // Signatures Table (supports 2 or 3 signature columns dynamically, e.g., 3 columns for Mẫu CT01)
  const rawSignatures =
    template.signatures && template.signatures.length >= 2
      ? template.signatures
      : [
          { role: 'CÁN BỘ TIẾP NHẬN', note: '(Ký, ghi rõ họ tên)' },
          { role: 'NGƯỜI KÊ KHAI LÀM ĐƠN', note: '(Ký và ghi rõ họ tên)' },
        ];

  const colWidthPct = Math.floor(100 / rawSignatures.length);

  const signaturesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [
      new TableRow({
        children: rawSignatures.map(
          (sig) =>
            new TableCell({
              width: { size: colWidthPct, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: sig.role, bold: true, size: 22, font: 'Times New Roman' })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: sig.note, italics: true, size: 20, font: 'Times New Roman' })],
                }),
                new Paragraph({ spacing: { before: 1400 } }), // Signature blank space
              ],
            })
        ),
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
                            text: `${wardName}, ngày ...... tháng ...... năm ${year}`,
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
          ...bodyChildren,

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
