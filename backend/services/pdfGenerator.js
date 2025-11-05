const PDFDocument = require('pdfkit');
const fs = require('fs-extra');
const path = require('path');

function generatePDFReport(analysis) {
    const doc = new PDFDocument();
    const filePath = path.join(__dirname, '../uploads/report.pdf');
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Title
    doc.fontSize(20).text('Student Analysis Report', { align: 'center' });
    doc.moveDown();

    // Individual Analysis
    analysis.forEach((student, index) => {
        doc.fontSize(16).text(`Student: ${student.name}`);
        doc.fontSize(12).text(`Average Score: ${student.averageScore.toFixed(2)}%`);
        
        doc.moveDown();
        doc.text('Subject Scores:');
        Object.entries(student.scores).forEach(([subject, score]) => {
            doc.text(`${subject}: ${score}%`);
        });

        doc.moveDown();
        doc.text('Recommended Courses:');
        student.recommendedCourses.forEach(course => {
            doc.text(`• ${course.name}`);
        });

        doc.moveDown();
        doc.text('Strengths:');
        student.strengths.forEach(strength => {
            doc.text(`• ${strength.comment}`);
        });

        doc.moveDown();
        doc.text('Areas for Improvement:');
        student.improvements.forEach(improvement => {
            doc.text(`• ${improvement.comment}`);
        });

        if (index < analysis.length - 1) {
            doc.addPage();
        }
    });

    doc.end();
    return filePath;
}