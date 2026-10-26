/*
 pairingPrompt.js - ESP3D WebUI component file

 Approve or deny a slicer's OctoPrint API key request (Application Keys).
 ESP3D announces requests on the websocket as "PAIRING:<token>:<app>" and
 repeats them while they are pending; "PAIRING:done:<token>" closes the prompt.

 This code is free software; you can redistribute it and/or
 modify it under the terms of the GNU Lesser General Public
 License as published by the Free Software Foundation; either
 version 2.1 of the License, or (at your option) any later version.
 This code is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 Lesser General Public License for more details.
 You should have received a copy of the GNU Lesser General Public
 License along with This code; if not, write to the Free Software
 Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/
import { h } from "preact"
import { useEffect, useState } from "preact/hooks"
import { Key } from "preact-feather"
import { espHttpURL } from "../Helpers"
import { T } from "../Translations"

const pairingEvent = "esp3d-pairing"

// Called by the websocket handler with the text after "PAIRING:".
const notifyPairing = (message) => {
    const separator = message.indexOf(":")
    if (separator < 0) return
    const first = message.substring(0, separator)
    const rest = message.substring(separator + 1)
    const detail =
        first == "done"
            ? { done: true, token: rest }
            : { done: false, token: first, app: rest }
    window.dispatchEvent(new CustomEvent(pairingEvent, { detail }))
}

const PairingPrompt = () => {
    const [requests, setRequests] = useState([])
    const [error, setError] = useState(null)

    useEffect(() => {
        const listener = (e) => {
            const { done, token, app } = e.detail
            setRequests((current) =>
                done
                    ? current.filter((request) => request.token != token)
                    : current.find((request) => request.token == token)
                      ? current
                      : [...current, { token, app }]
            )
        }
        window.addEventListener(pairingEvent, listener)
        return () => window.removeEventListener(pairingEvent, listener)
    }, [])

    if (requests.length == 0) return null
    const request = requests[0]

    const decide = (decision) => {
        setError(null)
        fetch(espHttpURL("plugin/appkeys/decision/" + request.token), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ decision }),
        })
            .then((response) => {
                if (response.status != 204 && response.status != 404)
                    throw new Error(response.status)
                setRequests((current) =>
                    current.filter((item) => item.token != request.token)
                )
            })
            .catch((e) => setError(T("Request failed") + " (" + e.message + ")"))
    }

    return (
        <div class="modal active" id="modal-pairing">
            <div class="modal-overlay" />
            <div class="modal-container">
                <div class="modal-header">
                    <div class="text-primary feather-icon-container modal_title">
                        <Key />
                        <label>{T("Slicer pairing")}</label>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="content">
                        <p>
                            <strong>{request.app}</strong>{" "}
                            {T("asks for an API key to upload and print.")}
                        </p>
                        <p class="text-gray">
                            {T("You can also approve it by clicking the printer's knob while the printer shows the prompt.")}
                        </p>
                        {error && <p class="text-error">{error}</p>}
                    </div>
                </div>
                <div class="modal-footer">
                    <button
                        class="btn btn-primary mx-2"
                        onClick={() => decide(true)}
                    >
                        {T("Allow")}
                    </button>
                    <button class="btn mx-2" onClick={() => decide(false)}>
                        {T("Deny")}
                    </button>
                </div>
            </div>
        </div>
    )
}

export { PairingPrompt, notifyPairing }
