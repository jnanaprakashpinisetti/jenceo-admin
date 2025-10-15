import React, { useState } from 'react'
import ShopForm from '../components/Shop/ShopForm'

export default function Accounts() {
  const [open, setOpen] = useState(false);
  return (
    <div className="layout-body">
      <button className="btn btn-primary" onClick={() => setOpen(true)}>కొనుగోలు</button>
      {open && <ShopForm onClose={() => setOpen(false)} />}
    </div>
  )
}
