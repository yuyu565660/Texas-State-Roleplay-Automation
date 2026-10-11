const fs = require("fs");
const path = require("path");


const file =
path.join(
    __dirname,
    "infractions.json"
);



if(!fs.existsSync(file)){

    fs.writeFileSync(
        file,
        JSON.stringify([], null, 4)
    );

}



function getInfractions(){

    return JSON.parse(
        fs.readFileSync(
            file,
            "utf8"
        )
    );

}



function addInfraction(data){

    const list =
    getInfractions();


    list.push({

        id:
        list.length + 1,

        discordId:
        data.discordId,

        username:
        data.username,

        robloxName:
        data.robloxName,

        command:
        data.command,

        reason:
        data.reason,

        punishment:
        data.punishment,

        issuedBy:
        "Automatic Security System",

        timestamp:
        Date.now()

    });



    fs.writeFileSync(

        file,

        JSON.stringify(
            list,
            null,
            4
        )

    );

}



module.exports = {

    addInfraction,

    getInfractions

};
