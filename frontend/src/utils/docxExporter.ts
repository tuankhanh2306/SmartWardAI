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
 * Generate and trigger download of a genuine .docx file conforming to Decree 30/2020/ND-CP & BCA CT01 Standard.
 * Unified 100% with the on-screen "Phôi Mẫu Trắng" and PDF export, formatted cleanly to fit on 1 single A4 page.
 */
export async function exportA4TemplateToDocx(
  template: A4FormTemplate,
  wardName: string,
  _initialData: Record<string, string> = {}
): Promise<void> {
  const today = new Date();
  const year = today.getFullYear();

  const isCt01 = template.procedureCode === 'TTHC-CR-01' || template.formCode.includes('CT01');
  const isBirthReg = template.procedureCode === 'TTHC-HT-01';
  const isMarriageReg = template.procedureCode === 'TTHC-HT-02';
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
            spacing: { before: 45, after: 45 },
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
                  spacing: { before: 45, after: 45 },
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

  // Build top header block
  // Helper to build a bordered "Ảnh" photo box for TỜ KHAI ĐĂNG KÝ KẾT HÔN
  const createPhotoBoxTable = (): Table =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: gridBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ spacing: { before: 420, after: 0 } }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0 },
                  children: [new TextRun({ text: 'Ảnh', size: 22, font: 'Times New Roman' })],
                }),
                new Paragraph({ spacing: { before: 0, after: 420 } }),
              ],
            }),
          ],
        }),
      ],
    });

  // For Mẫu CT01: NO left agency name and NO top date line — only top-right form code note + centered Quốc hiệu - Tiêu ngữ!
  // For Mẫu TTHC-HT-02 (Tờ khai Đăng ký kết hôn): Left "Ảnh" box | Centered Quốc hiệu + Title + Kính gửi | Right "Ảnh" box!
  const headerChildren: Array<Paragraph | Table> = isCt01
    ? [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 0, after: 40 },
          children: [
            new TextRun({
              text: 'Mẫu CT01 ban hành kèm theo TT 66/2023/TT-BCA (sửa đổi tại TT 53/2025/TT-BCA & TT 116/2026/TT-BCA)',
              italics: true,
              size: 19, // 9.5pt
              font: 'Times New Roman',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 20, after: 20 },
          children: [
            new TextRun({
              text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
              bold: true,
              size: 24, // 12pt
              font: 'Times New Roman',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 20 },
          children: [
            new TextRun({
              text: 'Độc lập – Tự do – Hạnh phúc',
              bold: true,
              size: 26, // 13pt
              font: 'Times New Roman',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
          children: [
            new TextRun({
              text: '_______________________',
              bold: true,
              size: 20,
              font: 'Times New Roman',
            }),
          ],
        }),
      ]
    : isBirthReg
    ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 20 },
          children: [
            new TextRun({
              text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
              bold: true,
              size: 24, // 12pt
              font: 'Times New Roman',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 20 },
          children: [
            new TextRun({
              text: 'Độc lập - Tự do - Hạnh phúc',
              bold: true,
              size: 25, // 12.5pt
              font: 'Times New Roman',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 60 },
          children: [
            new TextRun({
              text: '_______________________',
              bold: true,
              size: 20,
              font: 'Times New Roman',
            }),
          ],
        }),
      ]
    : isMarriageReg
    ? [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorders,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 17, type: WidthType.PERCENTAGE },
                  borders: noBorders,
                  children: [createPhotoBoxTable()],
                }),
                new TableCell({
                  width: { size: 66, type: WidthType.PERCENTAGE },
                  borders: noBorders,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 20, after: 20 },
                      children: [
                        new TextRun({
                          text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                          bold: true,
                          size: 22, // 11pt
                          font: 'Times New Roman',
                        }),
                      ],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 0, after: 140 },
                      children: [
                        new TextRun({
                          text: 'Độc lập – Tự do – Hạnh phúc',
                          bold: true,
                          size: 23, // 11.5pt
                          font: 'Times New Roman',
                        }),
                      ],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 60, after: 120 },
                      children: [
                        new TextRun({
                          text: 'TỜ KHAI ĐĂNG KÝ KẾT HÔN',
                          bold: true,
                          size: 28, // 14pt
                          font: 'Times New Roman',
                        }),
                      ],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 40, after: 80 },
                      children: [
                        new TextRun({
                          text: `Kính gửi: Ủy ban nhân dân ${wardName}`,
                          size: 23, // 11.5pt
                          font: 'Times New Roman',
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 17, type: WidthType.PERCENTAGE },
                  borders: noBorders,
                  children: [createPhotoBoxTable()],
                }),
              ],
            }),
          ],
        }),
      ]
    : [
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
      ];

  // Build body elements (Paragraphs & Tables)
  const bodyChildren: Array<Paragraph | Table> = [];

  // Title block (skipped for TTHC-HT-02 because title & Kính gửi sit between the two "Ảnh" boxes)
  if (!isMarriageReg) {
    bodyChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: isCt01 ? 80 : 180, after: 40 },
        children: [
          new TextRun({
            text: template.title,
            bold: true,
            size: 28, // 14pt
            font: 'Times New Roman',
          }),
        ],
      })
    );

    if (!isCt01 && !isBirthReg) {
      bodyChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: `${template.legalNote} [${template.formCode}]`,
              italics: true,
              size: 22, // 11pt
              font: 'Times New Roman',
            }),
          ],
        })
      );
    }

    bodyChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: isCt01 || isBirthReg ? 80 : 180 },
        children: [
          new TextRun({
            text: 'Kính gửi: ',
            bold: !isBirthReg,
            italics: !isCt01 && !isBirthReg,
            size: 24, // 12pt
            font: 'Times New Roman',
          }),
          new TextRun({
            text:
              isCt01 || isBirthReg
                ? '............................................................................'
                : template.recipient.replace(/\{WARD_NAME\}/g, wardName),
            bold: !isCt01 && !isBirthReg,
            size: 24, // 12pt
            font: 'Times New Roman',
          }),
        ],
      })
    );
  }

  // Special exact 1-page BCA layout for Mẫu CT01 (TTHC-CR-01) without footnote markers (1)-(8) or footnote block
  if (template.procedureCode === 'TTHC-CR-01') {
    bodyChildren.push(
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text: '1. Họ, chữ đệm và tên khai sinh: ........................................................................................',
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
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
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text: '5. Số điện thoại liên hệ: ............................................        6. Email: .................................',
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text: '7. Họ, chữ đệm và tên chủ hộ: ......................................   8. Mối quan hệ với chủ hộ: ............................',
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      }),
      create12DigitBoxesRow('9. Số định danh cá nhân của chủ hộ'),
      new Paragraph({
        spacing: { before: 40, after: 30 },
        children: [
          new TextRun({
            text: '10. Nội dung đề nghị: .................................................................................................................',
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 20, after: 40 },
        children: [
          new TextRun({
            text: '..........................................................................................................................................................',
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 40, after: 40 },
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
            spacing: { before: 45, after: 45 },
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
            spacing: { before: 70, after: 70 },
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
          ...[1, 2, 3, 4].map(
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

    // 4-Column Bordered Signature Table for CT01 (clean, without footnote numbers (4)-(8))
    const makeSigHeaderCell = (roleText: string) =>
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 30, after: 15 },
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
            spacing: { before: 15, after: 30 },
            children: [new TextRun({ text: roleText, bold: true, size: 19, font: 'Times New Roman' })],
          }),
        ],
      });

    const makeSigSpaceCell = () =>
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ spacing: { before: 950, after: 60 } })],
      });

    const makeVneidNoteCell = (hasNote: boolean) =>
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        children: hasNote
          ? [
              new Paragraph({
                spacing: { before: 30, after: 15 },
                children: [new TextRun({ text: 'Họ và tên: .........................', size: 18, font: 'Times New Roman' })],
              }),
              new Paragraph({
                spacing: { before: 15, after: 30 },
                children: [new TextRun({ text: 'Số định danh cá nhân: ..............', size: 18, font: 'Times New Roman' })],
              }),
            ]
          : [new Paragraph({ spacing: { before: 30, after: 30 } })],
      });

    bodyChildren.push(
      new Paragraph({ spacing: { before: 80, after: 20 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: gridBorders,
        rows: [
          new TableRow({
            children: [
              makeSigHeaderCell('Ý KIẾN CỦA CHỦ HỘ'),
              makeSigHeaderCell('Ý KIẾN CỦA CHỦ SỞ HỮU CHỖ Ở HỢP PHÁP'),
              makeSigHeaderCell('Ý KIẾN CỦA CHA HOẶC MẸ HOẶC NGƯỜI GIÁM HỘ'),
              makeSigHeaderCell('NGƯỜI KÊ KHAI'),
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
  } else if (template.procedureCode === 'TTHC-HT-01') {
    // Official 1-page MOJ layout for TỜ KHAI ĐĂNG KÝ KHAI SINH (Phụ lục 5 TT 04/2020/TT-BTP & TT 04/2024/TT-BTP)
    const addKsLine = (label: string, dots: string, boldLabel: boolean = false) =>
      new Paragraph({
        spacing: { before: 28, after: 28 },
        children: [
          new TextRun({ text: label, bold: boldLabel, size: 23, font: 'Times New Roman' }),
          new TextRun({ text: dots, size: 23, font: 'Times New Roman' }),
        ],
      });

    bodyChildren.push(
      addKsLine('Họ, chữ đệm, tên người yêu cầu: ', '........................................................................................', true),
      addKsLine('Ngày, tháng, năm sinh: ', '.............................................................................................................'),
      addKsLine('Nơi cư trú: ', '..............................................................................................................................'),
      addKsLine('', '................................................................................................................................................'),
      addKsLine('Giấy tờ tùy thân: ', '.....................................................................................................................'),
      addKsLine('', '................................................................................................................................................'),
      addKsLine('Quan hệ với người được khai sinh: ', '............................................................................................'),
      new Paragraph({
        spacing: { before: 45, after: 28 },
        children: [
          new TextRun({
            text: 'Đề nghị cơ quan đăng ký khai sinh cho người dưới đây:',
            bold: true,
            size: 23,
            font: 'Times New Roman',
          }),
        ],
      }),
      addKsLine('Họ, chữ đệm, tên: ', '.....................................................................................................................', true),
      addKsLine('Ngày, tháng, năm sinh: ', '................................................... ghi bằng chữ: .......................................'),
      addKsLine('', '................................................................................................................................................'),
      addKsLine('Giới tính: ', '......................... Dân tộc: ......................... Quốc tịch: ............................................'),
      addKsLine('Nơi sinh: ', '.................................................................................................................................'),
      addKsLine('', '................................................................................................................................................'),
      addKsLine('Quê quán: ', '...............................................................................................................................'),
      addKsLine('Họ, chữ đệm, tên người mẹ: ', '....................................................................................................', true),
      addKsLine('Năm sinh: ', '.................................................... Dân tộc: ........................ Quốc tịch: ......................'),
      addKsLine('Nơi cư trú: ', '..............................................................................................................................'),
      addKsLine('', '................................................................................................................................................'),
      addKsLine('Giấy tờ tùy thân: ', '.....................................................................................................................'),
      addKsLine('Họ, chữ đệm, tên người cha: ', '....................................................................................................', true),
      addKsLine('Năm sinh: ', '.................................................... Dân tộc: ........................ Quốc tịch: ......................'),
      addKsLine('Nơi cư trú: ', '..............................................................................................................................'),
      addKsLine('', '................................................................................................................................................'),
      addKsLine('Giấy tờ tùy thân: ', '.....................................................................................................................'),
      new Paragraph({
        spacing: { before: 35, after: 25 },
        children: [
          new TextRun({
            text: 'Thông tin về Giấy chứng nhận kết hôn của cha, mẹ trẻ (nếu cha, mẹ trẻ đã ĐKKH):',
            italics: true,
            size: 23,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 15, after: 35 },
        children: [
          new TextRun({
            text: 'Số: .............., Quyển số: .............., đăng ký ngày ..... tháng ..... năm .......... tại .................................',
            italics: true,
            size: 23,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 30, after: 20 },
        children: [
          new TextRun({
            text: 'Tôi cam đoan nội dung đề nghị đăng ký khai sinh trên đây là đúng sự thật, được sự thỏa thuận nhất trí của các bên liên quan theo quy định pháp luật.',
            size: 23,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 15, after: 40 },
        children: [
          new TextRun({
            text: 'Tôi chịu hoàn toàn trách nhiệm trước pháp luật về nội dung cam đoan của mình.',
            size: 23,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 48, type: WidthType.PERCENTAGE },
                borders: noBorders,
                children: [
                  new Paragraph({ spacing: { before: 520, after: 20 } }),
                  new Paragraph({
                    spacing: { before: 0, after: 30 },
                    children: [new TextRun({ text: '____________________________________', bold: true, size: 18, font: 'Times New Roman' })],
                  }),
                  new Paragraph({
                    spacing: { before: 20, after: 20 },
                    children: [new TextRun({ text: 'Đề nghị cấp bản sao: Có □ , Không □', size: 21, font: 'Times New Roman' })],
                  }),
                  new Paragraph({
                    spacing: { before: 20, after: 20 },
                    children: [new TextRun({ text: 'Số lượng: ....... bản', size: 21, font: 'Times New Roman' })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 52, type: WidthType.PERCENTAGE },
                borders: noBorders,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 20, after: 30 },
                    children: [
                      new TextRun({
                        text: 'Làm tại: ..........................., ngày ........ tháng ........ năm .............',
                        italics: true,
                        size: 22,
                        font: 'Times New Roman',
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 20, after: 15 },
                    children: [new TextRun({ text: 'Người yêu cầu', bold: true, size: 23, font: 'Times New Roman' })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 20 },
                    children: [
                      new TextRun({
                        text: '(Ký, ghi rõ họ, chữ đệm, tên)',
                        italics: true,
                        size: 21,
                        font: 'Times New Roman',
                      }),
                    ],
                  }),
                  new Paragraph({ spacing: { before: 700 } }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  } else if (template.procedureCode === 'TTHC-HT-02') {
    // Official 3-column layout (Thông tin | Bên nữ | Bên nam) matching TỜ KHAI ĐĂNG KÝ KẾT HÔN
    const makeCell = (text: string, widthPct: number, opts?: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] }) =>
      new TableCell({
        width: { size: widthPct, type: WidthType.PERCENTAGE },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        children: text.split('\n').map(
          (line) =>
            new Paragraph({
              alignment: opts?.align ?? AlignmentType.LEFT,
              spacing: { before: 20, after: 20 },
              children: [new TextRun({ text: line, bold: opts?.bold ?? false, size: 22, font: 'Times New Roman' })],
            })
        ),
      });

    const rowsData: Array<[string, string, string]> = [
      ['Họ, chữ đệm, tên', '................................................', '................................................'],
      ['Ngày, tháng, năm sinh', '....../....../..........', '....../....../..........'],
      ['Dân tộc', '........................', '........................'],
      ['Quốc tịch', '........................', '........................'],
      ['Nơi cư trú', '................................................\n................................................', '................................................\n................................................'],
      [
        'Giấy tờ tùy thân',
        'Số CCCD/CMND: ......................\nCơ quan cấp: ...........................\nNgày cấp: ....../....../..........',
        'Số CCCD/CMND: ......................\nCơ quan cấp: ...........................\nNgày cấp: ....../....../..........',
      ],
      ['Kết hôn lần thứ mấy', '........................', '........................'],
    ];

    bodyChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: gridBorders,
        rows: [
          new TableRow({
            children: [
              makeCell('Thông tin', 28, { bold: true, align: AlignmentType.CENTER }),
              makeCell('Bên nữ', 36, { bold: true, align: AlignmentType.CENTER }),
              makeCell('Bên nam', 36, { bold: true, align: AlignmentType.CENTER }),
            ],
          }),
          ...rowsData.map(
            ([label, femaleVal, maleVal]) =>
              new TableRow({
                children: [
                  makeCell(label, 28),
                  makeCell(femaleVal, 36),
                  makeCell(maleVal, 36),
                ],
              })
          ),
        ],
      })
    );

    // Exact 3 commitment paragraphs & right-aligned date + Bên nữ (left) / Bên nam (right) signatures
    bodyChildren.push(
      new Paragraph({
        spacing: { before: 180, after: 40 },
        indent: { firstLine: 450 },
        children: [
          new TextRun({
            text: 'Chúng tôi cam đoan những lời khai trên đây là đúng sự thật, việc kết hôn của chúng tôi là tự nguyện, không vi phạm quy định của Luật hôn nhân và gia đình Việt Nam.',
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 20, after: 40 },
        indent: { firstLine: 450 },
        children: [
          new TextRun({
            text: 'Chúng tôi chịu hoàn toàn trách nhiệm trước pháp luật về cam đoan của mình.',
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 20, after: 100 },
        indent: { firstLine: 450 },
        children: [
          new TextRun({
            text: 'Đề nghị Quý cơ quan đăng ký.',
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 40, after: 140 },
        children: [
          new TextRun({
            text: `Tỉnh An Giang, ngày ...... tháng ...... năm ${year}`,
            italics: true,
            size: 22,
            font: 'Times New Roman',
          }),
        ],
      }),
      new Table({
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
                    children: [new TextRun({ text: 'Bên nữ', bold: true, size: 23, font: 'Times New Roman' })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '(Ký, ghi rõ họ, chữ đệm, tên)', size: 21, font: 'Times New Roman' })],
                  }),
                  new Paragraph({ spacing: { before: 1100 } }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'Bên nam', bold: true, size: 23, font: 'Times New Roman' })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '(Ký, ghi rõ họ, chữ đệm, tên)', size: 21, font: 'Times New Roman' })],
                  }),
                  new Paragraph({ spacing: { before: 1100 } }),
                ],
              }),
            ],
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
            spacing: { before: 160, after: 60 },
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
                spacing: { before: 50, after: 50 },
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
                spacing: { before: 50, after: 50 },
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
              spacing: { before: 50, after: 50 },
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

  // For templates without custom footer blocks (non-CT01, non-TTHC-HT-01, and non-TTHC-HT-02), append standard commitment text and signatures
  if (
    template.procedureCode !== 'TTHC-CR-01' &&
    template.procedureCode !== 'TTHC-HT-01' &&
    template.procedureCode !== 'TTHC-HT-02'
  ) {
    bodyChildren.push(
      new Paragraph({
        spacing: { before: 200, after: 160 },
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
                    new Paragraph({ spacing: { before: 1200 } }),
                  ],
                })
            ),
          }),
        ],
      })
    );
  }

  // Construct Document (compact margins for CT01 so it fits 100% on 1 A4 page)
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Times New Roman',
            size: 24, // 12pt
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
              top: convertMillimetersToTwip(isCt01 || isBirthReg ? 12 : 18),
              bottom: convertMillimetersToTwip(isCt01 || isBirthReg ? 12 : 18),
              left: convertMillimetersToTwip(isCt01 || isBirthReg ? 20 : 22),
              right: convertMillimetersToTwip(15),
            },
          },
        },
        children: [...headerChildren, ...bodyChildren],
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
