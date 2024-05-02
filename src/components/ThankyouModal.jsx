import React from 'react'

export default function ThankyouModal({cancleFun,modalClass}) {
  return (
    <>
    <div className={modalClass}>
                <div className="modal-dialog">
                    <div className="modal-content">

                        <div className="modal-header">
                            <h2 className="modal-title">Thank You</h2>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" onClick={cancleFun}></button>
                        </div>

                        <div className="modal-body">
                            <h4>Your Data hasbeen saved</h4>
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={cancleFun}>Ok</button>
                        </div>

                    </div>
                </div>
            </div>
      
    </>
  )
}
