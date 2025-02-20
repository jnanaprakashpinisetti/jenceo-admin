import React, { useState } from 'react';


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
    const [permanentAddress, setPermanentAddress] = useState(false);
    const [peresentAddress, setPeresentAddress] = useState(false);
    const [personalInformation, setPersonalInformation] = useState(false);
    const [qualificationSkills, setQualificationSkills] = useState(false);
    const [healthDetails, setHealthDetails] = useState(false);
    const [emergencyContact1, setEmergencyContact1] = useState(false);
    const [emergencyContact2, setEmergencyContact2] = useState(false);
    const [emergencyContact3, setEmergencyContact3] = useState(false);
    const [bankAccountDetails, setBankAccountDetails] = useState(false);


    return (
        <div className='form-wrapper'>
            <form name="employeeInfoForm" id="employeeInfoForm"  >
                <div className="row">
                    <BasicInfo />
                    {permanentAddress && <PermanentAddress />}
                    {peresentAddress && <PeresentAddress />}
                    {personalInformation && <PersonalInformation />}
                    {qualificationSkills && <QualificationSkills />}
                    {healthDetails && <HealthDetails />}
                    {emergencyContact1 && <EmergencyContact1 />}
                    {emergencyContact2 && <EmergencyContact2 />}
                    {emergencyContact3 && <EmergencyContact3 />}
                    {bankAccountDetails && <BankAccountDetails />}
                </div>
            </form>
        </div>
    )
}
