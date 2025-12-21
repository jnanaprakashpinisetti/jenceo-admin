// In your main component
import React, { useState } from "react";
import HomeCareClientForm from "../components/HomeCareClient/HomeCareClientForm";

 

export default function HomeCareClient() {
  const [showHomeCareForm, setShowHomeCareForm] = useState(false);

  return (
    <div className="layout-body client-info">
    <div className='row'>
      <div className='col-md-12'>
      <div className='text-center'>
      <button className="btn btn-warning m-auto" onClick={() => setShowHomeCareForm(true)}>
        Open Housekeeping Client Form
      </button>
      
      <HomeCareClientForm 
        isOpen={showHomeCareForm} 
        onClose={() => setShowHomeCareForm(false)} 
      />
    </div>
    </div>
    </div>
    </div>
  );
}
