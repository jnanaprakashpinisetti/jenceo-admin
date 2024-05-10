export default function InvestModal({
    cancleFun,
    name,
    amount,
    date,
    actionText,
    actionFun
 }) {


    return (

        <>
            <div className="modal" id="investModal">
                <div className="modal-dialog">
                    <div className="modal-content">

                        <div className="modal-header">
                            <h4 className="modal-title">Do you want to Save Details ?</h4>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={cancleFun}></button>
                        </div>

                        <div className="modal-body">
                            <p>Name: <strong> {name} </strong></p>
                            <p>Amount: <strong>{amount}</strong></p>
                            <p>Date: <strong>{date}</strong></p>
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn btn-danger" data-bs-dismiss="modal" onClick={cancleFun}>Cancle</button>
                            <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={actionFun}>{actionText}</button>
                        </div>

                    </div>
                </div>
            </div>
        </>
    )
}
