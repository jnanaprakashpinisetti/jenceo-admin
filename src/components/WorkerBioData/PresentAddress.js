import React, { useState, useEffect } from 'react';



// --- India State/District lists for typeahead (Present Address) ---
const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"
];

const STATE_DISTRICTS = {
  "Andhra Pradesh": ["Anantapur","Chittoor","East Godavari","Guntur","Krishna","Kurnool","Nellore","Prakasam","Srikakulam","Visakhapatnam","Vizianagaram","West Godavari","YSR Kadapa"],
  "Telangana": ["Adilabad","Bhadradri Kothagudem","Hyderabad","Jagtial","Jangaon","Jayashankar Bhupalpally","Jogulamba Gadwal","Kamareddy","Karimnagar","Khammam","Komaram Bheem","Mahabubabad","Mahabubnagar","Mancherial","Medak","Medchal–Malkajgiri","Mulugu","Nagarkurnool","Nalgonda","Narayanpet","Nirmal","Nizamabad","Peddapalli","Rajanna Sircilla","Ranga Reddy","Sangareddy","Siddipet","Suryapet","Vikarabad","Wanaparthy","Warangal Rural","Warangal Urban","Yadadri Bhuvanagiri"],
  "Karnataka": ["Bagalkot","Ballari","Belagavi","Bengaluru Rural","Bengaluru Urban","Bidar","Chamarajanagar","Chikkaballapur","Chikkamagaluru","Chitradurga","Dakshina Kannada","Davangere","Dharwad","Gadag","Hassan","Haveri","Kalaburagi","Kodagu","Kolar","Koppal","Mandya","Mysuru","Raichur","Ramanagara","Shivamogga","Tumakuru","Udupi","Uttara Kannada","Vijayapura","Yadgir"],
  "Tamil Nadu": ["Chennai","Coimbatore","Cuddalore","Dharmapuri","Dindigul","Erode","Kanchipuram","Kanniyakumari","Karur","Krishnagiri","Madurai","Nagapattinam","Namakkal","Nilgiris","Perambalur","Pudukkottai","Ramanathapuram","Salem","Sivaganga","Thanjavur","Theni","Thiruvallur","Thiruvarur","Thoothukudi","Tiruchirappalli","Tirunelveli","Tiruppur","Tiruvannamalai","Vellore","Viluppuram","Virudhunagar"],
  "Maharashtra": ["Mumbai City","Mumbai Suburban","Pune","Nagpur","Nashik","Thane","Aurangabad","Solapur","Amravati","Kolhapur","Jalgaon","Latur","Dhule","Ahmednagar","Satara","Chandrapur","Buldhana","Yavatmal","Raigad","Sangli","Akola","Gondia","Wardha","Beed","Nanded","Osmanabad","Parbhani","Ratnagiri","Washim","Gadchiroli","Nandurbar","Hingoli","Palghar","Sindhudurg","Jalna"],
  // ... add more states as needed
};
const PresentAddress = ({ formData, errors, handleChange, handleBlur, nextStep, prevStep }) => {
  const [sameAsPermanent, setSameAsPermanent] = useState(false);

  // Effect to handle checkbox state changes
  useEffect(() => {
    if (sameAsPermanent) {
      // Copy permanent address data to present address
      const addressFields = [
        'Address', 'Street', 'Landmark', 'Village',
        'Mandal', 'District', 'State', 'Pincode'
      ];

      addressFields.forEach(field => {
        const permanentField = `permanent${field}`;
        const presentField = `present${field}`;

        if (formData[permanentField]) {
          // Create a synthetic event to update the form data
          const syntheticEvent = {
            target: {
              name: presentField,
              value: formData[permanentField]
            }
          };
          handleChange(syntheticEvent);
        }
      });
    }
  }, [sameAsPermanent, formData, handleChange]);

  const handleCheckboxChange = (e) => {
    setSameAsPermanent(e.target.checked);
  };

  return (
    <div>

      <div className="form-card-header mb-4">
        <h3 className="text-center">Present Address</h3>
      </div>
      <hr></hr>

      {/* Same as Permanent Address Checkbox */}
      <div className="row mb-4" style={{maxWidth:"50%"}}>
        <div className="col-12" >
          <div className="form-check" >
            <input
              className="form-check-input"
              type="checkbox"
              id="sameAsPermanent"
              checked={sameAsPermanent}
              onChange={handleCheckboxChange}
            />
            <label className="form-check-label" htmlFor="sameAsPermanent">
              Same as Permanent Address
            </label>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-6">
          <label htmlFor="presentAddress" className="form-label">Address / D.No<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.presentAddress ? 'is-invalid' : ''}`}
            id="presentAddress"
            name="presentAddress"
            value={formData.presentAddress}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={sameAsPermanent}
          />
          {errors.presentAddress && <div className="invalid-feedback">{errors.presentAddress}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="presentStreet" className="form-label">Street Name <span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.presentStreet ? 'is-invalid' : ''}`}
            id="presentStreet"
            name="presentStreet"
            value={formData.presentStreet}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={sameAsPermanent}
          />
          {errors.presentStreet && <div className="invalid-feedback">{errors.presentStreet}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="presentLandmark" className="form-label">Land Mark</label>
          <input
            type="text"
            className="form-control"
            id="presentLandmark"
            name="presentLandmark"
            value={formData.presentLandmark}
            onChange={handleChange}
            disabled={sameAsPermanent}
          />
        </div>

        <div className="col-md-6">
          <label htmlFor="presentVillage" className="form-label">Village / Town<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.presentVillage ? 'is-invalid' : ''}`}
            id="presentVillage"
            name="presentVillage"
            value={formData.presentVillage}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={sameAsPermanent}
          />
          {errors.presentVillage && <div className="invalid-feedback">{errors.presentVillage}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="presentMandal" className="form-label">Mandal<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.presentMandal ? 'is-invalid' : ''}`}
            id="presentMandal"
            name="presentMandal"
            value={formData.presentMandal}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={sameAsPermanent}
          />
          {errors.presentMandal && <div className="invalid-feedback">{errors.presentMandal}</div>}
        </div>

             <div className="col-md-6">
          <label htmlFor="presentState" className="form-label">State<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.presentState ? 'is-invalid' : ''}`}
            id="presentState"
            name="presentState" list="presentStatesList"
            value={formData.presentState}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={sameAsPermanent}
          />
          <datalist id="presentStatesList">
            {INDIAN_STATES.map((s) => (<option key={s} value={s} />))}
          </datalist>
          {errors.presentState && <div className="invalid-feedback">{errors.presentState}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="presentDistrict" className="form-label">District<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.presentDistrict ? 'is-invalid' : ''}`}
            id="presentDistrict"
            name="presentDistrict" list="presentDistrictsList"
            value={formData.presentDistrict}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={sameAsPermanent}
          />
          <datalist id="presentDistrictsList">
            {(STATE_DISTRICTS[formData.presentState] || []).map((d) => (<option key={d} value={d} />))}
          </datalist>
          {errors.presentDistrict && <div className="invalid-feedback">{errors.presentDistrict}</div>}
        </div>

   

        <div className="col-md-6">
          <label htmlFor="presentPincode" className="form-label">Pin Code<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.presentPincode ? 'is-invalid' : ''}`}
            id="presentPincode"
            name="presentPincode"
            value={formData.presentPincode}
            onChange={(e) => {
              if (/^\d{0,6}$/.test(e.target.value)) {
                handleChange(e);
              }
            }}
            onBlur={handleBlur}
            maxLength={6}
            disabled={sameAsPermanent}
          />
          {errors.presentPincode && <div className="invalid-feedback">{errors.presentPincode}</div>}
        </div>

        {/* <div className="col-12 mt-4">
          <button type="button" className="btn btn-primary float-end" onClick={nextStep}>
            Next <i className="bi bi-arrow-right"></i>
          </button>
          <button type="button" className="btn btn-secondary me-2" onClick={prevStep}>
            <i className="bi bi-arrow-left"></i> Previous
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default PresentAddress;