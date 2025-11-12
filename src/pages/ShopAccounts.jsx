import React, { useState } from 'react'
import ShopForm from '../components/Shop/ShopForm'
import CustmorForm from '../components/Shop/CustmorForm'
import PurchaseDetail from '../components/Shop/PurchaseDetails';

export default function Accounts() {
  const [shopFormOpen, setShopFormOpen] = useState(false);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  
  return (
    <div className="layout-body">
      <button className="btn btn-primary" onClick={() => setShopFormOpen(true)}>
        కొనుగోలు
      </button>
      {shopFormOpen && <ShopForm onClose={() => setShopFormOpen(false)} />}

      <button 
        className="btn btn-warning ms-2" 
        onClick={() => setCustomerFormOpen(true)}
      >
        అరువులు
      </button>
      {customerFormOpen && (
        <CustmorForm 
          onSuccess={() => setCustomerFormOpen(false)}
          onCancel={() => setCustomerFormOpen(false)}
        />
      )}

      <div>
        <PurchaseDetail />
      </div>
    </div>
  )
}