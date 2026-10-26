/*
 SD-source.js - ESP3D WebUI Target file

 Copyright (c) 2020 Luc Lebosse. All rights reserved.

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
import { canProcessFile } from "../../helpers"
import {
    formatFileSizeToString,
    sortedFilesList,
    formatStatus,
    filterResultFiles,
} from "../../../components/Helpers"
import { useUiContextFn, useSettingsContextFn } from "../../../contexts"

//Extract information from string - specific to FW / source
const formatFileSerialLine = (lines) => {
    const filesFilter = useUiContextFn.getValue("filesfilter") //get extension list
    const extRegExp = new RegExp("([$a-zA-Z0-9!#\u0020+-]+)", "g")
    const extensionsPattern = [...filesFilter.matchAll(extRegExp)]
        .map((item) => item[1].trim())
        .join("|")
    const fileNamePattern = new RegExp(
        `\\.(?:${extensionsPattern})$`,
        "i"
    )
    return lines.reduce((acc, file) => {
        // M20 L returns: <8.3 path> <size> <long file name>.
        // Keep the first field for commands sent to Marlin and expose the
        // last field solely as the name shown by the UI.
        const m = file
            .trim()
            .match(/^(?<path>\S+)\s+(?<size>\d+)(?:\s+(?<displayName>.+))?$/)
        if (
            m &&
            (fileNamePattern.test(m.groups.displayName) ||
                fileNamePattern.test(m.groups.path))
        ) {
            const { path, size, displayName } = m.groups
            return [
                ...acc,
                {
                    name: path,
                    displayName: displayName || path,
                    size: formatFileSizeToString(size),
                },
            ]
        }
        return acc
    }, [])
}

const capabilities = {
    Process: (path, filename) => {
        return canProcessFile(filename)
    },
    UseFilters: () => true,
    IsFlatFS: () => true,
    Upload: (path, filename, eMsg = false) => {
        if (eMsg) return "E1"
        //TODO
        //check 8.1 if become true
        return useSettingsContextFn.getValue("SerialProtocol") == "MKS"
    },
    UploadMultiple: () => {
        return false
    },
    Download: () => {
        return false
    },
    DeleteFile: () => {
        return useSettingsContextFn.getValue("SerialProtocol") != "MKS"
    },
    DeleteDir: () => {
        return false
    },
    CreateDir: () => {
        return false
    },
}

const getSDListCommand = () => {
    const command = useUiContextFn.getValue("sdlistcmd")
    // Existing user preferences may still contain "M20" without L.
    return command.replace(/\bM20\b(?!\s+L\b)/i, "M20 L")
}

const commands = {
    list: (path, filename) => {
        return {
            type: "cmd",
            cmd: getSDListCommand(),
        }
    },
    upload: (path, filename) => {
        if (useSettingsContextFn.getValue("SerialProtocol") == "MKS")
            return {
                type: "url",
                url: "upload",
                args: { path },
            }
        //other is not supported so return list command for safety
        return {
            type: "cmd",
            cmd: useUiContextFn.getValue("sdlistcmd"),
        }
    },
    postUpload: (path, filename) => {
        if (useSettingsContextFn.getValue("SerialProtocol") == "MKS") {
            return {
                type: "refresh",
                arg: false,
                timeOut: 3000,
            }
        }
        return { type: "none" }
    },
    formatResult: (result) => {
        const files = formatFileSerialLine(result.content)
        const isSorted = useUiContextFn.getValue("sort_sd_files")
        console.log("sd is sorted", isSorted)
        return {
            files: isSorted? sortedFilesList(files, false) : files,
            status: formatStatus(result.status),
        }
    },
    filterResult: (data, path) => {
        //console.log(data)
        const isSorted = useUiContextFn.getValue("sort_sd_files")
        const res = {}
        res.files = isSorted? sortedFilesList(filterResultFiles(data.files, path), false) : filterResultFiles(data.files, path)
        res.status = formatStatus(data.status)
        return res
    },
    play: (path, filename) => {
        const spath = (path + (path == "/" ? "" : "/") + filename).replaceAll(
            "//",
            "/"
        )
        const cmd = useUiContextFn.getValue("sdplaycmd").replace("#", spath)
        return {
            type: "cmd",
            cmd,
        }
    },
    delete: (path, filename) => {
        const spath = (path + (path == "/" ? "" : "/") + filename).replaceAll(
            "//",
            "/"
        )
        const cmd = useUiContextFn.getValue("sddeletecmd").replace("#", spath)
        return {
            type: "cmd",
            cmd,
        }
    },
}

const responseSteps = {
    list: {
        start: (data) => data.startsWith("Begin file list"),
        end: (data) => data.startsWith("End file list"),
        error: (data) => {
            return (
                data.indexOf("error") != -1 ||
                data.indexOf("echo:No SD card") != -1 ||
                data.indexOf("echo:No media") != -1 ||
                data.indexOf('echo:Unknown command: "M21"') != -1 ||
                data.indexOf('echo:Unknown command: "M20"') != -1
            )
        },
    },
    delete: {
        start: (data) => data.startsWith("File deleted"),
        end: (data) => data.startsWith("ok") && !data.startsWith("ok T:"),
        error: (data) => {
            return data.startsWith("Deletion failed")
        },
    },
}

const SD = { capabilities, commands, responseSteps }

export { SD }
