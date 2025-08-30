import React, {useState} from 'react'
import WorkerCalleDisplay from '../components/workerCalles/WorkerCalleDisplay'
import WorkerCalleForm from '../components/workerCalles/WorkerCalleForm'


export default function WorkerCallsData() {
    const [showForm, setShowForm] = useState(false);
    return (
        <div className="layout-body">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-md-12">

                        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                            + Add Worker Call
                        </button>
                        <WorkerCalleForm isOpen={showForm} onClose={() => setShowForm(false)} />


                        <WorkerCalleDisplay />


                    </div>
                </div>
            </div>
        </div>
    )
}
