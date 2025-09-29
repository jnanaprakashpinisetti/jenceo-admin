

// --- India State/District lists for typeahead (Permanent) ---
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
  "Maharashtra": ["Ahmednagar","Akola","Amravati","Aurangabad","Beed","Bhandara","Buldhana","Chandrapur","Dhule","Gadchiroli","Gondia","Hingoli","Jalgaon","Jalna","Kolhapur","Latur","Mumbai City","Mumbai Suburban","Nagpur","Nanded","Nandurbar","Nashik","Osmanabad","Palghar","Parbhani","Pune","Raigad","Ratnagiri","Sangli","Satara","Sindhudurg","Solapur","Thane","Wardha","Washim","Yavatmal"],
  "Kerala": ["Alappuzha","Ernakulam","Idukki","Kannur","Kasaragod","Kollam","Kottayam","Kozhikode","Malappuram","Palakkad","Pathanamthitta","Thiruvananthapuram","Thrissur","Wayanad"],
  "Delhi": ["Central Delhi","East Delhi","New Delhi","North Delhi","North East Delhi","North West Delhi","Shahdara","South Delhi","South East Delhi","South West Delhi","West Delhi"],
  "Uttar Pradesh": ["Agra","Aligarh","Allahabad","Ambedkar Nagar","Amethi","Amroha","Auraiya","Azamgarh","Baghpat","Bahraich","Ballia","Balrampur","Banda","Barabanki","Bareilly","Basti","Bhadohi","Bijnor","Budaun","Bulandshahr","Chandauli","Chitrakoot","Deoria","Etah","Etawah","Ayodhya","Farrukhabad","Fatehpur","Firozabad","Gautam Buddha Nagar","Ghaziabad","Ghazipur","Gonda","Gorakhpur","Hamirpur","Hapur","Hardoi","Hathras","Jalaun","Jaunpur","Jhansi","Kannauj","Kanpur Dehat","Kanpur Nagar","Kasganj","Kaushambi","Kheri","Kushinagar","Lalitpur","Lucknow","Maharajganj","Mahoba","Mainpuri","Mathura","Mau","Meerut","Mirzapur","Moradabad","Muzaffarnagar","Pilibhit","Pratapgarh","Prayagraj","Rae Bareli","Rampur","Saharanpur","Sambhal","Sant Kabir Nagar","Sant Ravidas Nagar","Shahjahanpur","Shamli","Shrawasti","Siddharthnagar","Sitapur","Sonbhadra","Sultanpur","Unnao","Varanasi"],
  "West Bengal": ["Alipurduar","Bankura","Birbhum","Cooch Behar","Dakshin Dinajpur","Darjeeling","Hooghly","Howrah","Jalpaiguri","Jhargram","Kalimpong","Kolkata","Malda","Murshidabad","Nadia","North 24 Parganas","Paschim Bardhaman","Paschim Medinipur","Purba Bardhaman","Purba Medinipur","Purulia","South 24 Parganas","Uttar Dinajpur"]
};
const PermanentAddress = ({ formData, errors, handleChange, handleBlur, nextStep, prevStep }) => {
  return (
    <div>
      <div className="form-card-header mb-4">
        <h3 className="text-center">Permanent Address</h3>
      </div>
      <hr></hr>
      <div className="row g-3">
        <div className="col-6">
          <label htmlFor="permanentAddress" className="form-label">Address / D.No<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.permanentAddress ? 'is-invalid' : ''}`}
            id="permanentAddress"
            name="permanentAddress"
            value={formData.permanentAddress}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.permanentAddress && <div className="invalid-feedback">{errors.permanentAddress}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="permanentStreet" className="form-label">Street Name<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.permanentStreet ? 'is-invalid' : ''}`}
            id="permanentStreet"
            name="permanentStreet"
            value={formData.permanentStreet}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.permanentStreet && <div className="invalid-feedback">{errors.permanentStreet}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="permanentLandmark" className="form-label">Land Mark</label>
          <input
            type="text"
            className="form-control"
            id="permanentLandmark"
            name="permanentLandmark"
            value={formData.permanentLandmark}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-6">
          <label htmlFor="permanentVillage" className="form-label">Village / Town<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.permanentVillage ? 'is-invalid' : ''}`}
            id="permanentVillage"
            name="permanentVillage"
            value={formData.permanentVillage}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.permanentVillage && <div className="invalid-feedback">{errors.permanentVillage}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="permanentMandal" className="form-label">Mandal<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.permanentMandal ? 'is-invalid' : ''}`}
            id="permanentMandal"
            name="permanentMandal"
            value={formData.permanentMandal}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          {errors.permanentMandal && <div className="invalid-feedback">{errors.permanentMandal}</div>}
        </div>



        <div className="col-md-6">
          <label htmlFor="permanentState" className="form-label">State<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.permanentState ? 'is-invalid' : ''}`}
            id="permanentState"
            name="permanentState" list="statesList"
            value={formData.permanentState}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <datalist id="statesList">
            {INDIAN_STATES.map((s) => (<option key={s} value={s} />))}
          </datalist>
          {errors.permanentState && <div className="invalid-feedback">{errors.permanentState}</div>}
        </div>

                <div className="col-md-6">
          <label htmlFor="permanentDistrict" className="form-label">District<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.permanentDistrict ? 'is-invalid' : ''}`}
            id="permanentDistrict"
            name="permanentDistrict" list="districtsList"
            value={formData.permanentDistrict}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <datalist id="districtsList">
            {(STATE_DISTRICTS[formData.permanentState] || []).map((d) => (<option key={d} value={d} />))}
          </datalist>
          {errors.permanentDistrict && <div className="invalid-feedback">{errors.permanentDistrict}</div>}
        </div>

        <div className="col-md-6">
          <label htmlFor="permanentPincode" className="form-label">Pin Code<span className="star">*</span></label>
          <input
            type="text"
            className={`form-control ${errors.permanentPincode ? 'is-invalid' : ''}`}
            id="permanentPincode"
            name="permanentPincode"
            value={formData.permanentPincode}
            onChange={(e) => {
              if (/^\d{0,6}$/.test(e.target.value)) {
                handleChange(e);
              }
            }}
            onBlur={handleBlur}
            maxLength={6}
          />
          {errors.permanentPincode && <div className="invalid-feedback">{errors.permanentPincode}</div>}
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

export default PermanentAddress;