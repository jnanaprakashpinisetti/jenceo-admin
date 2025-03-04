import React from 'react';
import InputText from '../formElements/InputText';
import Button from '../formElements/Button';

export default function BankAccountDetails({ onBankAccountDetailsNext, onBankAccountDetailsPrevious }) {

    const bankAccountDetailsNext = () => {
        onBankAccountDetailsNext();  // Calling the parent function passed via props
    }

    const bankAccountDetailsPrevious = () => {
        onBankAccountDetailsPrevious();  // Calling the parent function passed via props
    }

    return (
        <div id='bankAccountDetails'>
            <h4>Bank Account Details</h4>
            <hr />
            <div className="row">
                <InputText
                    htmlFor="accountNo"
                    labelName="Account No"
                    type="number"
                    idName="accountNo"
                    inputName="accountNo"
                />
                <InputText
                    htmlFor="bankName"
                    labelName="Bank Name"
                    type="text"
                    idName="bankName"
                    inputName="bankName"
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="branchName"
                    labelName="Branch Name"
                    type="text"
                    idName="branchName"
                    inputName="branchName"
                />
                <InputText
                    htmlFor="ifscCode"
                    labelName="IFSC Code"
                    type="text"
                    idName="ifscCode"
                    inputName="ifscCode"
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="phonePay"
                    labelName="Phone Pay No"
                    type="number"
                    idName="phonePay"
                    inputName="phonePay"
                />
                <InputText
                    htmlFor="googlePay"
                    labelName="Google Pay No"
                    type="number"
                    idName="googlePay"
                    inputName="googlePay"
                />
            </div>

            <div className="row">
                <label htmlFor="employeeImg">Choose Employee Photo</label>
                <input type="file" id="employeeImg" name="employeeImg" accept="image/png, image/jpeg, image/jpg" />
            </div>

            <Button
                btnType="submit"
                btnID="accountNextBtn"
                btnClass="btn btn-success"
                btnText="Save"
                clickHandler={bankAccountDetailsNext}
            />

            <Button
                btnType="button"
                btnID="accountPreBtn"
                btnClass="btn primery"
                btnText="Previous"
                clickHandler={bankAccountDetailsPrevious}
            />
        </div>
    );
}
