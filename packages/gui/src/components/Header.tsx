import React from 'react';
import { Link } from 'react-router-dom';

const links: Array<{
    name:string,
    url: string
}> = [
    {
        name: "Home",
        url: "/"
    },
    {
        name: "About",
        url: "/about"
    }

]

export default function Header(){
    
    return (
        <div>
            <ul>
                {links.map((link, idx) => (
                    <Link to={link.url}>{link.name}</Link>
                ))}
            </ul>
        </div>
    )
}