/*
 slicerKeys.js - ESP3D WebUI features tab file

 Lists the API keys slicers got through OctoPrint pairing and lets an admin
 revoke them. Hidden when the firmware has no pairing support.

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
import { Trash2 } from "preact-feather"
import { ButtonImg } from "../../components/Controls"
import { espHttpURL } from "../../components/Helpers"
import { T } from "../../components/Translations"
import { useUiContextFn } from "../../contexts"

const keysURL = () => espHttpURL("api/plugin/appkeys")

const SlicerKeys = () => {
    const [data, setData] = useState(null)

    const load = () =>
        fetch(keysURL())
            .then((response) => (response.ok ? response.json() : null))
            .then((json) => setData(json))
            .catch(() => setData(null))

    const revoke = (id) => {
        useUiContextFn.haptic()
        fetch(keysURL(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: "revoke", id }),
        }).finally(load)
    }

    useEffect(() => {
        load()
    }, [])

    if (!data) return null
    return (
        <div class="panel panel-features">
            <div class="navbar">
                <span class="navbar-section text-ellipsis">
                    <strong class="text-ellipsis">{T("slicer keys")}</strong>
                </span>
                <span class="navbar-section">
                    <span style="height: 100%;">
                        <span class="label label-primary align-top">
                            {T("security")}
                        </span>
                    </span>
                </span>
            </div>
            <div class="panel-body panel-body-features">
                {!data.enabled && (
                    <div class="text-gray m-1">
                        {T("Turn on slicer pairing to let a slicer request a key.")}
                    </div>
                )}
                {data.keys.length == 0 && (
                    <div class="m-1">{T("No paired slicers")}</div>
                )}
                {data.keys.map((key) => (
                    <div class="d-flex m-1" style="align-items:center">
                        <span style="flex:1">
                            {key.app} <span class="text-gray">{key.key}</span>
                        </span>
                        <ButtonImg
                            sm
                            label={T("Revoke")}
                            icon={<Trash2 />}
                            onClick={() => revoke(key.id)}
                        />
                    </div>
                ))}
                <div class="m-1" />
            </div>
        </div>
    )
}

export { SlicerKeys }
