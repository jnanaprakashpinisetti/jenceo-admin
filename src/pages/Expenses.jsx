import React, {useState} from 'react'
import PettyCashForm from '../components/PettyCash/PettyCashForm'
import PettyCashReport from '../components/PettyCash/PettyCashReport'
import PettyCashModal  from '../components/PettyCash/PettyCashModal'



export default function Expenses() {
  
  const [isPettyCashOpen, setIsPettyCashOpen] = useState(false);
  return (
    <div className="layout-body">
      <div className="row">
        
        <div className="col-md-12">
        <div className="text-center">
          <button className="btn btn-warning text-center" onClick={() => setIsPettyCashOpen(true)}>
        Add Petty Cash
      </button>
      </div>
        <PettyCashModal
        isOpen={isPettyCashOpen}
        onClose={() => setIsPettyCashOpen(false)}
      />
      <hr></hr>
        <PettyCashReport />
        </div>
      </div>

    </div>
  )
}
