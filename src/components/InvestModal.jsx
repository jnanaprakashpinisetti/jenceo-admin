import React,  {useState} from 'react'

export default function InvestModal(props) {

    const [modal, setModal] = useState(false)
    
    const closeHandler = () => {
        setModal(!modal)
    }

    return (

        <>
            <div className= {modal ? "modal show" : "modal "} id="myModal">
                <div className="modal-dialog">
                    <div className="modal-content">

                        <div className="modal-header">
                            <h4 className="modal-title">Investment Details Saved</h4>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={closeHandler}></button>
                        </div>

                        <div className="modal-body">

                            <p>{props.name}</p>
                            <p>{props.date}</p>
                            <p>{props.amount}</p>


                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn btn-danger" data-bs-dismiss="modal" onClick={closeHandler}>Close</button>
                        </div>

                    </div>
                </div>
            </div>
        </>
    )
}
