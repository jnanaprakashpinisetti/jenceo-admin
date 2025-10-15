import React, { useState } from 'react'
import ShopForm from '../components/Shop/ShopForm'
import PurchaseDetail from '../components/Shop/PurchaseDetails';


export default function Accounts() {
  const [open, setOpen] = useState(false);
  return (
    <div className="layout-body">
      <button className="btn btn-primary" onClick={() => setOpen(true)}>కొనుగోలు</button>
      {open && <ShopForm onClose={() => setOpen(false)} />}

        <button className="btn btn-warning ms-2">అమ్మకం</button>

        <div>
          <PurchaseDetail />
        </div>
    </div>
  )
}
