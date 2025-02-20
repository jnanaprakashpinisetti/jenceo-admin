import React from 'react'
import InputText from '../formElements/InputText';
import Button from '../formElements/Button';

export default function BankAccountDetails() {
    return (
        <div id='bankAccountDetails'>
            <div className="row">
                <InputText
                    htmlFor="accountNo"
                    // star="*"
                    labelName="Account No"
                    type="number"
                    idName="accountNo"
                    inputName="accountNo"
                // inputVal=""
                // required="required"
                // eventHandler = ""
                />

                <InputText
                    htmlFor="bankName"
                    // star="*"
                    labelName="Bank Name"
                    type="text"
                    idName="bankName"
                    inputName="bankName"
                // inputVal=""
                // required="required"
                // eventHandler = ""
                />
            </div>

            <div className="row">
                <InputText
                    htmlFor="branchName"
                    // star="*"
                    labelName="Branch Name"
                    type="text"
                    idName="branchName"
                    inputName="branchName"
                // inputVal=""
                // required="required"
                // eventHandler = ""
                />

                <InputText
                    htmlFor="ifscCode"
                    // star="*"
                    labelName="IFSC Code"
                    type="text"
                    idName="ifscCode"
                    inputName="ifscCode"
                // inputVal=""
                // required="required"
                // eventHandler = ""
                />

            </div>

            <div className="row">
                <InputText
                    htmlFor="phonePay"
                    // star="*"
                    labelName="Phone Pay No"
                    type="number"
                    idName="phonePay"
                    inputName="phonePay"
                // inputVal=""
                // required="required"
                // eventHandler = ""
                />

                <InputText
                    htmlFor="googlePay"
                    // star="*"
                    labelName="Google Pay No"
                    type="number"
                    idName="googlePay"
                    inputName="googlePay"
                // inputVal=""
                // required="required"
                // eventHandler = ""
                />
            </div>

            <div className="row">
                <label for="employeeImg">Choose Employee Photo</label>
                <input type="file" id="employeeImg" name="employeeImg" accept="image/png, image/jpeg, imgage/jpg" />
            </div>

            <Button
                btnType="submit"
                btnID="accountNextBtn"
                btnClass="btn btn-success"
                btnText="Save"
            />

            <Button
                btnType="button"
                btnID="accountPreBtn"
                btnClass="btn primery"
                btnText="Previous"
            />


        </div>
    )
}
