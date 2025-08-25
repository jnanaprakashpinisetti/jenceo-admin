import React from 'react'
import HospitalForm from '../components/Hospitals/HospitalForm'
import DisplayHospital from '../components/Hospitals/DisplayHospital'



export default function HospitalList() {
    return (
        <div className="layout-body">
            <div className='container-fluid'>
                <div className='row'>
                    <div className='col-md-4'>
                        <HospitalForm />

                    </div>
                    <div className='col-md-8'>
                        <DisplayHospital />

                    </div>
                </div>

            </div>
        </div>
    )
}
