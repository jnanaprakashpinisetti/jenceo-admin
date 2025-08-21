import React, { useState, useRef, useEffect } from 'react';

const WorkerAgreement = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    salary: '',
    experience: '',
    signature: '',
    date: ''
  });
  const [isJsPdfLoaded, setIsJsPdfLoaded] = useState(false);
  const agreementRef = useRef(null);

  useEffect(() => {
    // Load jsPDF dynamically
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.async = true;
    script.onload = () => setIsJsPdfLoaded(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Agreement content in different languages with form elements
  const agreementContent = {
    telugu: {
      title: 'ఉద్యోగ ఒప్పందం (Telugu)',
      content: `
        <div class="mb-3">
          <label class="form-label fw-bold">పేరు (Name):</label>
          <input type="text" placeholder="మొదటి పేరు" class="form-control mb-2" />
          <input type="text" placeholder="చివరి పేరు" class="form-control" />
        </div>
        
        <div class="mb-3">
          <label class="form-label fw-bold">ప్రాథమిక వేతనం (Basic Salary):</label>
          <input type="number" placeholder="₹ వేతనం నమోదు చేయండి" class="form-control" />
        </div>
        
        <div class="mb-3">
          <label class="form-label fw-bold">అనుభవం (Experience):</label>
          <input type="text" placeholder="సంవత్సరాలలో అనుభవం" class="form-control" />
        </div>
        
        <div class="mb-3 p-3 bg-white border border-2 border-dashed rounded">
          <p class="mb-2 fw-bold">ఈ ఒప్పందం ద్వారా ఉద్యోగి మా కంపెనీలో పని చేస్తున్నారు. ప్రాథమిక వేతనం నిర్ణయించబడుతుంది మరియు అనుభవం ప్రకారం స్కిల్స్ గుర్తించబడతాయి.</p>
        </div>
        
        <div class="row mb-3">
          <div class="col-md-6">
            <label class="form-label fw-bold">సంతకం (Signature):</label>
            <input type="text" placeholder="మీ సంతకం" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label fw-bold">తేదీ (Date):</label>
            <input type="date" class="form-control" />
          </div>
        </div>
      `
    },
    english: {
      title: 'Employment Agreement (English)',
      content: `
        <div class="mb-3">
          <label class="form-label fw-bold">Full Name:</label>
          <input type="text" placeholder="First Name" class="form-control mb-2" />
          <input type="text" placeholder="Last Name" class="form-control" />
        </div>
        
        <div class="mb-3">
          <label class="form-label fw-bold">Basic Salary:</label>
          <input type="number" placeholder="Enter salary amount" class="form-control" />
        </div>
        
        <div class="mb-3">
          <label class="form-label fw-bold">Work Experience:</label>
          <input type="text" placeholder="Years of experience" class="form-control" />
        </div>
        
        <div class="mb-3 p-3 bg-white border border-2 border-dashed rounded">
          <p class="mb-2 fw-bold">This agreement confirms that the employee is employed at our company. The basic salary will be determined and skills will be recognized based on experience.</p>
        </div>
        
        <div class="row mb-3">
          <div class="col-md-6">
            <label class="form-label fw-bold">Signature:</label>
            <input type="text" placeholder="Your signature" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label fw-bold">Date:</label>
            <input type="date" class="form-control" />
          </div>
        </div>
      `
    },
    hindi: {
      title: 'रोजगार समझौता (Hindi)',
      content: `
        <div class="mb-3">
          <label class="form-label fw-bold">पूरा नाम (Full Name):</label>
          <input type="text" placeholder="पहला नाम" class="form-control mb-2" />
          <input type="text" placeholder="अंतिम नाम" class="form-control" />
        </div>
        
        <div class="mb-3">
          <label class="form-label fw-bold">मूल वेतन (Basic Salary):</label>
          <input type="number" placeholder="वेतन राशि दर्ज करें" class="form-control" />
        </div>
        
        <div class="mb-3">
          <label class="form-label fw-bold">कार्य अनुभव (Work Experience):</label>
          <input type="text" placeholder="वर्षों का अनुभव" class="form-control" />
        </div>
        
        <div class="mb-3 p-3 bg-white border border-2 border-dashed rounded">
          <p class="mb-2 fw-bold">इस समझौते के माध्यम से, कर्मचारी हमारी कंपनी में कार्यरत है। मूल वेतन निर्धारित किया जाएगा और अनुभव के आधार पर कौशल को मान्यता दी जाएगी।</p>
        </div>
        
        <div class="row mb-3">
          <div class="col-md-6">
            <label class="form-label fw-bold">हस्ताक्षर (Signature):</label>
            <input type="text" placeholder="आपके हस्ताक्षर" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label fw-bold">तारीख (Date):</label>
            <input type="date" class="form-control" />
          </div>
        </div>
      `
    },
    urdu: {
      title: 'ملازمت کا معاہدہ (Urdu)',
      content: `
        <div class="mb-3">
          <label class="form-label fw-bold">پورا نام (Full Name):</label>
          <input type="text" placeholder="پہلا نام" class="form-control mb-2" />
          <input type="text" placeholder="آخری نام" class="form-control" />
        </div>
        
        <div class="mb-3">
          <label class="form-label fw-bold">بنیادی تنخواہ (Basic Salary):</label>
          <input type="number" placeholder="تنخواہ کی رقم درج کریں" class="form-control" />
        </div>
        
        <div class="mb-3">
          <label class="form-label fw-bold">کام کا تجربہ (Work Experience):</label>
          <input type="text" placeholder="سالوں کا تجربہ" class="form-control" />
        </div>
        
        <div class="mb-3 p-3 bg-white border border-2 border-dashed rounded">
          <p class="mb-2 fw-bold">اس معاہدے کے ذریعے، ملازم हमारी کمپनी में کام کر रहा है। بنیادی تنخواہ کا تعین किया जाएगा और تجربے کی بنیاد پر مہارتوں کو تسلیم किया जाएگا।</p>
        </div>
        
        <div class="row mb-3">
          <div class="col-md-6">
            <label class="form-label fw-bold">دستخط (Signature):</label>
            <input type="text" placeholder="آپ کے دستخط" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label fw-bold">تاریخ (Date):</label>
            <input type="date" class="form-control" />
          </div>
        </div>
      `
    }
  };

  const languages = [
    { id: 'telugu', label: 'Telugu' },
    { id: 'english', label: 'English' },
    { id: 'hindi', label: 'Hindi' },
    { id: 'urdu', label: 'Urdu' }
  ];

  const currentContent = agreementContent[selectedLanguage.toLowerCase()];

  // Print functionality
  const handlePrint = () => {
    const printContent = agreementRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
      <div class="container-fluid p-4">
        <h2 class="text-center text-dark mb-4">Worker Agreement</h2>
        <h3 class="text-center text-secondary mb-4">${currentContent.title}</h3>
        <div class="border rounded p-4">
          ${currentContent.content}
        </div>
        <div class="mt-4 text-center text-muted small">
          Printed on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </div>
      </div>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  // Download as PDF functionality
  const handleDownloadPDF = () => {
    if (!isJsPdfLoaded) {
      alert('PDF generator is still loading. Please try again in a moment.');
      return;
    }

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      // Add header
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Worker Agreement', 105, 20, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setTextColor(60, 60, 60);
      doc.text(currentContent.title, 105, 30, { align: 'center' });
      
      // Add some spacing
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Please print and fill out this agreement form', 105, 45, { align: 'center' });
      
      // Add form fields representation
      let yPosition = 60;
      
      // Name fields
      doc.text('Full Name:', 15, yPosition);
      doc.rect(15, yPosition + 5, 80, 8); // First name box
      doc.rect(100, yPosition + 5, 80, 8); // Last name box
      yPosition += 20;
      
      // Salary field
      doc.text('Basic Salary:', 15, yPosition);
      doc.rect(15, yPosition + 5, 165, 8);
      yPosition += 20;
      
      // Experience field
      doc.text('Work Experience:', 15, yPosition);
      doc.rect(15, yPosition + 5, 165, 8);
      yPosition += 20;
      
      // Agreement text
      const agreementText = currentContent.title.includes('English') ? 
        'This agreement confirms employment terms and conditions.' :
        'Employment agreement terms and conditions.';
      
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(agreementText, 180);
      doc.text(splitText, 15, yPosition);
      yPosition += 20;
      
      // Signature and Date
      doc.setFontSize(12);
      doc.text('Signature:', 15, yPosition);
      doc.rect(15, yPosition + 5, 80, 8);
      
      doc.text('Date:', 100, yPosition);
      doc.rect(100, yPosition + 5, 80, 8);
      
      // Add footer
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, 280);
      
      // Save the PDF
      doc.save(`Worker_Agreement_Form_${selectedLanguage}_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="container-fluid py-4">
      <div className="row justify-content-center">
        <div className="col-lg-10 col-xl-8">
          {/* Header */}
          <div className="text-center mb-5">
            <h2 className="text-primary fw-bold">Worker Agreement Form</h2>
            <p className="text-muted">Fill out the employment agreement form</p>
          </div>

          {/* Language Selection */}
          <div className="aggrement-card shadow-sm mb-4">
            <div className="card-header bg-light">
              <h5 className="card-title mb-0">Select Language:</h5>
            </div>
            <div className="card-body">
              <div className="d-flex flex-wrap gap-3">
                {languages.map(language => (
                  <div key={language.id} className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      id={language.id}
                      name="language"
                      value={language.label}
                      checked={selectedLanguage === language.label}
                      onChange={() => setSelectedLanguage(language.label)}
                    />
                    <label className="form-check-label fw-medium" htmlFor={language.id}>
                      {language.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Agreement Content with Form Elements */}
          <div ref={agreementRef} className="aggrement-card shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h5 className="card-title text-center text-primary mb-0">
                {currentContent.title}
              </h5>
            </div>
            <div className="card-body">
              <div 
                dangerouslySetInnerHTML={{ __html: currentContent.content }}
                className="bg-light p-4 rounded border"
              />
            </div>
            <div className="card-footer bg-white border-top">
              <div className="text-center">
                <button
                  onClick={handlePrint}
                  className="btn btn-success me-3 px-4"
                >
                  <i className="bi bi-printer me-2"></i>Print Agreement
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={!isJsPdfLoaded}
                  className="btn btn-primary px-4"
                >
                  {!isJsPdfLoaded ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Loading...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-download me-2"></i>Download as PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* Bootstrap Icons CDN */}
      <link 
        rel="stylesheet" 
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" 
      />
      
      {/* Bootstrap CSS CDN */}
      <link 
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" 
        rel="stylesheet" 
      />
    </div>
  );
};

export default WorkerAgreement;