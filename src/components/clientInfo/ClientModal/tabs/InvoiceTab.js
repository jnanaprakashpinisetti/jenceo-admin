import React from "react";
import ShareInvoice from "../../ShareInvoice";

const InvoiceTab = ({ formData }) => {
  return (
    <div>
      <ShareInvoice
        client={formData}
        payments={formData.payments || []}
        billTitle="Client Invoice"
      />
    </div>
  );
};

export default InvoiceTab;