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
    const [showBasicInfo, setShowBasicInfo] = useState(true);
    const [permanentAddress, setPermanentAddress] = useState(false);
    const [peresentAddress, setPeresentAddress] = useState(false);
    const [personalInformation, setPersonalInformation] = useState(false);
    const [qualificationSkills, setQualificationSkills] = useState(false);
    const [healthDetails, setHealthDetails] = useState(false);
    const [emergencyContact1, setEmergencyContact1] = useState(false);
    const [emergencyContact2, setEmergencyContact2] = useState(false);
    const [emergencyContact3, setEmergencyContact3] = useState(false);
    const [bankAccountDetails, setBankAccountDetails] = useState(false);

    // Function to handle the "Next" button click in BasicInfo
    const handleBasicInfoNext = () => {
        setShowBasicInfo(false); // Hide BasicInfo
        setPermanentAddress(true); // Show PermanentAddress
    };
    const handlePermanentAddressNext = () => {
        setPermanentAddress(false); // Hide Premanent Address
        setPeresentAddress(true); // Show Present Address
    };
    const handlePermanentAddressPrevious = () => {
        setPermanentAddress(false); // Hide BasicInfo
        setShowBasicInfo(true); // Show BasicInfoss
    };

    const handlePresentAddressNext = () => {
        setPeresentAddress(false); // Hide Present Address
        setPersonalInformation(true); // Showing Personal Details
    }
    const handlePresentAddressPrevious = () => {
        setPeresentAddress(false) //Hide Present Address
        setPermanentAddress(true); // Show Present Address
    }

    const handlePrsonalInformationNext = () => {
        setPersonalInformation(false); // Hide Personal Information
        setQualificationSkills(true) // Showing Qualification

    }
    const handlePrsonalInformationPrevious = () => {
        setPersonalInformation(false); // Hide Personal Information
        setPeresentAddress(true); // Showing Present Address
    }

    const handQualificationNext = () => {
        setQualificationSkills(false) // Hide Qualification
        setHealthDetails(true) //Showing Helth Details

    }
    const handQualificationPrevious = () => {
        setQualificationSkills(false) // Hide Qualification
        setPersonalInformation(true); // Hide Personal Information

    }
    const handleHealthDetailsNext = () => {
        setHealthDetails(false) //Hide Helth Details
        setEmergencyContact1(true) // Showing Emergency Contact
    }
    const handleHealthDetailsPrevious = () => {
        setHealthDetails(false) //Hide Helth Details
        setQualificationSkills(true) // Showing Qualification
    }
    const handleEmergencyContact1Next = () => {
        setEmergencyContact1(false) // Hide Emergency Contact
        setEmergencyContact2(true) // Showing Emergency Contact2
    }

    const handleEmergencyContact1Previous = () => {
        setEmergencyContact1(false) // Hide Emergency Contact
        setHealthDetails(true) // Showing Helth details
    }

    const handleEmergencyContact2Next = () => {
        setEmergencyContact2(false) // Hide Emergency Contact 2
        setEmergencyContact3(true) // Showing Emergency Contact3
    }
    const handleEmergencyContact2Previous = () => {
        setEmergencyContact1(true) // Hide Emergency Contact
        setEmergencyContact2(false) // Showing Qualification
    }

    const handleEmergencyContact3Next = () => {
        setEmergencyContact3(false) // Hide Emergency Contact
        setBankAccountDetails(true) // Showing Bank Details

    }
    const handleEmergencyContact3Previous = () => {
        setEmergencyContact3(false) // Hide Emergency Contact
        setEmergencyContact2(true) // Showing Qualification

    }

    const handleBankAccountDetailsSubmit = () => {

    }
    const handleBankAccountDetailsPrevious = () => {
        setBankAccountDetails(false) // Showing Bank Details
        setEmergencyContact3(true) // Showing Qualification

    }
    return (
        <div className='form-wrapper'>
            <form name="employeeInfoForm" id="employeeInfoForm">
                <div className="row">
                    {showBasicInfo && <BasicInfo onBasicInfoNext={handleBasicInfoNext} />}
                    {permanentAddress && <PermanentAddress onPermanentAddressNext={handlePermanentAddressNext} onPermanentAddressPrevious={handlePermanentAddressPrevious} />}
                    {peresentAddress && <PeresentAddress onPresentAddressNext={handlePresentAddressNext} onPresentAddressPrevious={handlePresentAddressPrevious} />}
                    {personalInformation && <PersonalInformation onPermanentAddressNext={handlePrsonalInformationNext} onPermanentAddressPrevious={handlePrsonalInformationPrevious} />}
                    {qualificationSkills && <QualificationSkills onQualificationNext={handQualificationNext} onQualificationPrevious={handQualificationPrevious} />}
                    {healthDetails && <HealthDetails onHealthDetailsNext={handleHealthDetailsNext} onHealthDetailsPrevious={handleHealthDetailsPrevious} />}
                    {emergencyContact1 && <EmergencyContact1 onEmergencyContact1Next={handleEmergencyContact1Next} onEmergencyContact1Previous={handleEmergencyContact1Previous} />}
                    {emergencyContact2 && <EmergencyContact2 onEmergencyContact2Next={handleEmergencyContact2Next} onEmergencyContact2Previous={handleEmergencyContact2Previous} />}
                    {emergencyContact3 && <EmergencyContact3 onEmergencyContact3Next={handleEmergencyContact3Next} onEmergencyContact3Previous={handleEmergencyContact3Previous} />}
                    {bankAccountDetails && <BankAccountDetails onBankAccountDetailsNext={handleBankAccountDetailsSubmit} onBankAccountDetailsPrevious={handleBankAccountDetailsPrevious} />}
                </div>
            </form>
        </div>
    );
}