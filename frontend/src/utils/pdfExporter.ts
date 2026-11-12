import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Xuất trực tiếp vùng tài liệu A4 thành tệp PDF tiêu chuẩn tải về máy
 * Hoàn toàn không gọi window.print(), không mở hộp thoại in của trình duyệt.
 */
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2, // Độ phân giải 2x sắc nét chuẩn in/lưu trữ hành chính
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.96);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = 210; // A4 standard width (mm)
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  const pageHeight = 297; // A4 standard height (mm)

  if (pdfHeight <= pageHeight) {
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  } else {
    let position = 0;
    let remainingHeight = pdfHeight;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
    remainingHeight -= pageHeight;

    while (remainingHeight > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      remainingHeight -= pageHeight;
    }
  }

  const cleanFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(cleanFilename);
}
