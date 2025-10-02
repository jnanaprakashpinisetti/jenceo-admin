import React, { useState } from 'react'
import HospitalForm from '../components/Hospitals/HospitalForm'
import DisplayHospital from '../components/Hospitals/DisplayHospital'



export default function HospitalList() {
    const [showHospitalModal, setShowHospitalModal] = useState(false);
    return (
        <div className="layout-body">
            <div className="m-auto text-center">
                <button className="btn btn-warning" onClick={() => setShowHospitalModal(true)}>+ New Hospital</button>
                <HospitalForm
                    show={showHospitalModal}
                    onClose={() => setShowHospitalModal(false)}
                    title="Add New Hospital"
                // isEdit and initialData are still supported if you pass them
                />
            </div>
            <hr></hr>
            <div className='row'>

                <div className='col-md-12'>
                    <DisplayHospital />

                </div>
            </div>

        </div>
    )
}
