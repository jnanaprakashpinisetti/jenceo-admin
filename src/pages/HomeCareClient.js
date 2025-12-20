// In your main component
import React, { useState } from "react";
import HomeCareClientForm from "../components/HomeCareClient/HomeCareClientForm";

 

export default function HomeCareClient() {
  const [showHomeCareForm, setShowHomeCareForm] = useState(false);

  return (
    <div>
      <button onClick={() => setShowHomeCareForm(true)}>
        Open Home Care Client Form
      </button>
      
      <HomeCareClientForm 
        isOpen={showHomeCareForm} 
        onClose={() => setShowHomeCareForm(false)} 
      />
    </div>
  );
}
