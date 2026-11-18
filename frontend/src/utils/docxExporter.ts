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
 * Unified 100% with the on-screen "Phôi Mẫu Trắng" and PDF export, including 12-cell ID boxes and official tables.
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

  /**
   * Helper to render a label followed by a 12-cell bordered box grid for 12-digit Personal ID (Số định danh cá nhân)
   */
  const create12DigitBoxesRow = (labelText: string): Table => {
    const boxCells: TableCell[] = Array.from({ length: 12 }, () =>
      new TableCell({
        width: { size: 5, type: WidthType.PERCENTAGE },
        borders: {
          top: borderThin,
          bottom: borderThin,
          left: borderThin,
          right: borderThin,
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 60 },
            children: [new TextRun({ text: ' ', size: 22, font: 'Times New Roman' })],
          }),
        ],
      })
    );

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [
                new Paragraph({
                  spacing: { before: 60, after: 60 },
                  children: [new TextRun({ text: `${labelText}: `, size: 24, font: 'Times New Roman' })],
                }),
              ],
            }),
            ...boxCells,
          ],
        }),
      ],
    });
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
      spacing: { before: 100, after: 200 },
      children: [
        new TextRun({
          text: template.procedureCode === 'TTHC-CR-01' ? 'Kính gửi (1): ' : 'Kính gửi: ',
          bold: true,
          italics: true,
          size: 26, // 13pt
          font: 'Times New Roman',
        }),
        new TextRun({
          text:
            template.procedureCode === 'TTHC-CR-01'
              ? '............................................................................'
              : template.recipient.replace(/\{WARD_NAME\}/g, wardName),
          bold: true,
          size: 26, // 13pt
          font: 'Times New Roman',
        }),
      ],
    })
  );

  // Special exact layout for Mẫu CT01 (TTHC-CR-01)
  if (template.procedureCode === 'TTHC-CR-01') {
    bodyChildren.push(
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({
            text: '1. Họ, chữ đệm và tên khai sinh: ........................................................................................',
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({
            text: '2. Ngày, tháng, năm sinh: ............./................/................        3. Giới tính: ...................',
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      }),
      create12DigitBoxesRow('4. Số định danh cá nhân'),
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({
            text: '5. Số điện thoại liên hệ: ............................................        6. Email: .................................',
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({
            text: '7. Họ, chữ đệm và tên chủ hộ (2): ..................................   8. Mối quan hệ với chủ hộ: ............................',
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      }),
      create12DigitBoxesRow('9. Số định danh cá nhân của chủ hộ'),
      new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({
            text: '10. Nội dung đề nghị (3): ............................................................................................................',
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 20, after: 60 },
        children: [
          new TextRun({
            text: '..........................................................................................................................................................',
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({
            text: '11. Những thành viên trong hộ gia đình cùng thay đổi:',
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    // 6-column table for Item 11 (TT | Họ, chữ đệm và tên | Ngày, tháng, năm sinh | Giới tính | Số định danh cá nhân | Mối quan hệ với chủ hộ)
    const makeHeaderCell = (text: string, widthPct: number) =>
      new TableCell({
        width: { size: widthPct, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 60, after: 60 },
            children: [new TextRun({ text, bold: true, size: 20, font: 'Times New Roman' })],
          }),
        ],
      });

    const makeBlankCell = (widthPct: number) =>
      new TableCell({
        width: { size: widthPct, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 90, after: 90 },
            children: [new TextRun({ text: ' ', size: 20, font: 'Times New Roman' })],
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
              makeHeaderCell('TT', 6),
              makeHeaderCell('Họ, chữ đệm và tên', 26),
              makeHeaderCell('Ngày, tháng, năm sinh', 16),
              makeHeaderCell('Giới tính', 10),
              makeHeaderCell('Số định danh cá nhân', 22),
              makeHeaderCell('Mối quan hệ với chủ hộ', 20),
            ],
          }),
          ...[1, 2, 3, 4, 5].map(
            () =>
              new TableRow({
                children: [
                  makeBlankCell(6),
                  makeBlankCell(26),
                  makeBlankCell(16),
                  makeBlankCell(10),
                  makeBlankCell(22),
                  makeBlankCell(20),
                ],
              })
          ),
        ],
      })
    );

    // 4-Column Bordered Signature Table for CT01: (4), (5), (6), (7) + bottom row (8)
    const makeSigHeaderCell = (roleText: string) =>
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 20 },
            children: [
              new TextRun({
                text: '......, ngày......tháng....năm......',
                italics: true,
                size: 18,
                font: 'Times New Roman',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 20, after: 40 },
            children: [new TextRun({ text: roleText, bold: true, size: 19, font: 'Times New Roman' })],
          }),
        ],
      });

    const makeSigSpaceCell = () =>
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ spacing: { before: 1200, after: 100 } })],
      });

    const makeVneidNoteCell = (hasNote: boolean) =>
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        children: hasNote
          ? [
              new Paragraph({
                spacing: { before: 40, after: 20 },
                children: [new TextRun({ text: '(8) Họ và tên: .......................', size: 18, font: 'Times New Roman' })],
              }),
              new Paragraph({
                spacing: { before: 20, after: 40 },
                children: [new TextRun({ text: '(8) Số định danh cá nhân: ............', size: 18, font: 'Times New Roman' })],
              }),
            ]
          : [new Paragraph({ spacing: { before: 40, after: 40 } })],
      });

    bodyChildren.push(
      new Paragraph({ spacing: { before: 120, after: 40 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: gridBorders,
        rows: [
          new TableRow({
            children: [
              makeSigHeaderCell('Ý KIẾN CỦA CHỦ HỘ (4)'),
              makeSigHeaderCell('Ý KIẾN CỦA CHỦ SỞ HỮU CHỖ Ở HỢP PHÁP (5)'),
              makeSigHeaderCell('Ý KIẾN CỦA CHA HOẶC MẸ HOẶC NGƯỜI GIÁM HỘ (6)'),
              makeSigHeaderCell('NGƯỜI KÊ KHAI (7)'),
            ],
          }),
          new TableRow({
            children: [makeSigSpaceCell(), makeSigSpaceCell(), makeSigSpaceCell(), makeSigSpaceCell()],
          }),
          new TableRow({
            children: [
              makeVneidNoteCell(false),
              makeVneidNoteCell(true),
              makeVneidNoteCell(true),
              makeVneidNoteCell(false),
            ],
          }),
        ],
      })
    );

    // Full Chú thích (1) -> (8) for CT01
    const footnotes = [
      'Chú thích:',
      '(1) Cơ quan đăng ký cư trú.',
      '(2) Trường hợp đăng ký thường trú, đăng ký tạm trú, tách hộ ghi thông tin chủ hộ gia đình mới.',
      '(3) Ghi rõ ràng, cụ thể nội dung đề nghị. Ví dụ: ghi chi tiết thông tin nơi đề nghị đăng ký thường trú hoặc nơi đề nghị đăng ký tạm trú hoặc nội dung đề nghị xác nhận thông tin về cư trú.',
      '(4) Áp dụng đối với các trường hợp quy định tại khoản 2, khoản 3, khoản 5, khoản 6 Điều 20; khoản 1 Điều 25; điểm a khoản 1 Điều 26 Luật Cư trú. Phương thức lấy ý kiến của chủ hộ: a) Chủ hộ ghi rõ nội dung đồng ý và ký, ghi rõ họ tên vào Tờ khai; b) Xác nhận qua ứng dụng định danh quốc gia; c) Có văn bản riêng ghi rõ nội dung đồng ý.',
      '(5) Áp dụng đối với các trường hợp quy định tại khoản 2, 3, 4, 5, 6 Điều 20; khoản 1 Điều 25; điểm a khoản 1 Điều 26 Luật Cư trú. Phương thức lấy ý kiến của chủ sở hữu chỗ ở hợp pháp: a) Ghi rõ nội dung đồng ý và ký, ghi rõ họ tên vào Tờ khai; b) Xác nhận qua ứng dụng định danh quốc gia (VNeID); c) Có văn bản riêng ghi rõ nội dung đồng ý.',
      '(6) Áp dụng đối với trường hợp người chưa thành niên, người hạn chế hành vi dân sự, người không đủ năng lực hành vi dân sự có thay đổi thông tin về cư trú.',
      '(7) Trường hợp nộp trực tiếp người kê khai ký, ghi rõ họ, chữ đệm và tên vào Tờ khai; Trường hợp nộp qua cổng dịch vụ công hoặc ứng dụng định danh quốc gia thì người kê khai không phải ký vào mục này.',
      '(8) Chỉ kê khai thông tin khi công dân đề nghị xác nhận nội dung đồng ý thông qua ứng dụng định danh quốc gia (VNeID).',
    ];

    for (let i = 0; i < footnotes.length; i++) {
      bodyChildren.push(
        new Paragraph({
          spacing: { before: i === 0 ? 120 : 20, after: 20 },
          children: [
            new TextRun({
              text: footnotes[i],
              bold: i === 0,
              size: 19, // 9.5pt
              font: 'Times New Roman',
            }),
          ],
        })
      );
    }
  } else if (template.procedureCode === 'TTHC-HT-02') {
    // Special two-column Bride & Groom layout for TTHC-HT-02 (Đăng ký kết hôn)
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
            'Số ĐDCN / CCCD: [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]',
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
    // Standard Sections & Fields for all other templates (with 12-digit boxes for ID/CCCD fields)
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
        const isIdLabel =
          field.label.includes('CCCD') ||
          field.label.includes('định danh') ||
          field.label.includes('ĐDCN');

        if (isIdLabel && field.type !== 'grid2') {
          bodyChildren.push(create12DigitBoxesRow(field.label));
        } else if (field.type === 'grid2' && field.secondLabel) {
          if (isIdLabel) {
            bodyChildren.push(create12DigitBoxesRow(field.label));
            bodyChildren.push(
              new Paragraph({
                spacing: { before: 60, after: 60 },
                children: [
                  new TextRun({ text: `${field.secondLabel}: `, size: 24, font: 'Times New Roman' }),
                  new TextRun({
                    text: '...........................................................................................................',
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
          }
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
  }

  // For non-CT01 templates, append commitment text and standard signatures table
  if (template.procedureCode !== 'TTHC-CR-01') {
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

    const rawSignatures =
      template.signatures && template.signatures.length >= 2
        ? template.signatures
        : [
            { role: 'CÁN BỘ TIẾP NHẬN', note: '(Ký, ghi rõ họ tên)' },
            { role: 'NGƯỜI KÊ KHAI LÀM ĐƠN', note: '(Ký và ghi rõ họ tên)' },
          ];

    const colWidthPct = Math.floor(100 / rawSignatures.length);

    bodyChildren.push(
      new Table({
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
                    new Paragraph({ spacing: { before: 1400 } }),
                  ],
                })
            ),
          }),
        ],
      })
    );
  }

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
              top: convertMillimetersToTwip(18),
              bottom: convertMillimetersToTwip(18),
              left: convertMillimetersToTwip(22),
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

          // Body Content (includes signatures & footnotes for CT01, or standard signatures for others)
          ...bodyChildren,
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
