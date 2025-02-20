import React from 'react';


import BasicInfo from './employeeInfoForm/BasicInfo';
import PermanentAddress from './employeeInfoForm/PermanentAddress';
import PeresentAddress from './employeeInfoForm/PeresentAddress';
import PersonalInformation from './employeeInfoForm/PersonalInformation';
import QualificationSkills from './employeeInfoForm/QualificationSkills';
import HealthDetails from './employeeInfoForm/HealthDetails';
import EmergencyContact1 from './employeeInfoForm/EmergencyContact1';
import EmergencyContact2 from './employeeInfoForm/EmergencyContact2';
import EmergencyContact3 from './employeeInfoForm/EmergencyContact3';
import BankAccountDetails from './employeeInfoForm/BankAccountDetails';


export default function EmployeeInfoForm() {


    return (
        <div className='form-wrapper'>
            <form name="employeeInfoForm" id="employeeInfoForm"  >
                <div className="row">
                    <BasicInfo />
                    <PermanentAddress />
                    <PeresentAddress />
                    <PersonalInformation />
                    <QualificationSkills />
                    <HealthDetails />
                    <EmergencyContact1 />
                    <EmergencyContact2 />
                    <EmergencyContact3 />
                    <BankAccountDetails />
                </div>
            </form>
        </div>
    )
}
