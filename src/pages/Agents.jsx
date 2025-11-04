import React, { useState } from 'react'
import AgentForm from '../components/Agents/AgentForm'
import AgentDisplay from '../components/Agents/AgentDisplay'


export default function Agents() {
  const [showAgentForm, setShowAgentForm] = useState(false)

  return (
    <div className="layout-body">
      <div className="container-fluid">
        {/* Header with Add Button */}
        <h2 className="text-white text-center">Agents Management</h2>
        <div className="d-flex justify-content-center align-items-center mb-4">
          <button
            className="btn btn-warning"
            onClick={() => setShowAgentForm(true)}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Add New Agent
          </button>
        </div>

        {/* Agent Form Modal */}
        <AgentForm
          show={showAgentForm}
          onClose={() => setShowAgentForm(false)}
          title="Add New Agent"
          onSubmit={(agentData) => {
            console.log('Agent saved:', agentData)
            setShowAgentForm(false)
            // You can refresh your agents list here later
          }}
        />
      </div>
      <hr></hr>
      <AgentDisplay />
    </div>
  )
}