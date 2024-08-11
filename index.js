import { characters, event_types, eventSource, saveSettingsDebounced, selectCharacterById, setActiveCharacter, setActiveGroup, this_chid } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { groups, openGroupById } from '../../../group-chats.js';
import { groupId } from '../SillyTavern-TriggerCards/index.js';

let isDiscord = null;
let currentChar;
/**@type {HTMLElement}*/
let trigger;
let menu = false;
const settings = Object.assign({
    showAvatar: true,
    showFavorites: false,
    onlyFavorites: false,
    highlightFavorites: true,
    numCards: 10,
}, extension_settings.charSwitchx ?? {});
extension_settings.charSwitch = settings;


const onChatChanged = async()=>{
    currentChar = characters[this_chid] ?? groups.find(it=>it.id == groupId);
    trigger.classList[currentChar && settings.showAvatar ? 'add' : 'remove']('stcs--char');
    trigger.style.setProperty('--stcs--avatar', `url("${await getAvatar(currentChar)}")`);
};

const compCards = (a,b)=>{
    if (settings.showFavorites) {
        if (a.fav && !b.fav) return -1;
        if (!a.fav && b.fav) return 1;
    }
    return b.date_last_chat - a.date_last_chat;
};
const getAvatar = async(character)=>{
    if (character.avatar) {
        // has avatar
        return `/thumbnail?type=avatar&file=${character.avatar}`;
    } else if (character.members) {
        const members = [
            ...(character.members ?? []),
            ...(character.disabled_members ?? []),
        ].filter((it,idx,list)=>idx == list.indexOf(it));
        // group without avatar
        if (members.length == 0) {
            // empty group ??
            return '/img/five.png';
        } else if (members.length == 1) {
            // single char ava
            return `/thumbnail?type=avatar&file=${members[0]}`;
        } else if (members.length == 2) {
            // left/right split
            const imgs = await Promise.all([0, 1].map(idx=>{
                const img = new Image();
                img.src = `/thumbnail?type=avatar&file=${members[idx]}`;
                return new Promise(resolve=>{
                    if (img.complete) resolve(img);
                    img.addEventListener('load', ()=>resolve(img));
                    img.addEventListener('error', ()=>resolve(img));
                });
            }));
            const sx = 96 * 0.25;
            const sw = 47;
            const canvas = document.createElement('canvas');
            canvas.height = 96;
            canvas.width = 96;
            const con = canvas.getContext('2d');
            con.drawImage(
                imgs[0],
                sx, 0,
                sw, 96,
                0, 0,
                47, 96,
            );
            con.drawImage(
                imgs[1],
                sx, 0,
                sw, 96,
                49, 0,
                47, 96,
            );
            return canvas.toDataURL();
        } else if (members.length == 3) {
            // two-top, one-bottom
            const imgs = await Promise.all([0, 1, 2].map(idx=>{
                const img = new Image();
                img.src = `/thumbnail?type=avatar&file=${members[idx]}`;
                return new Promise(resolve=>{
                    if (img.complete) resolve(img);
                    img.addEventListener('load', ()=>resolve(img));
                    img.addEventListener('error', ()=>resolve(img));
                });
            }));
            const canvas = document.createElement('canvas');
            canvas.height = 96;
            canvas.width = 96;
            const con = canvas.getContext('2d');
            con.drawImage(
                imgs[0],
                0, 0,
                96, 96,
                0, 0,
                47, 47,
            );
            con.drawImage(
                imgs[1],
                0, 0,
                96, 96,
                49, 0,
                47, 47,
            );
            con.drawImage(
                imgs[2],
                0, 0,
                96, 47,
                0, 49,
                96, 47,
            );
            return canvas.toDataURL();
        } else {
            // limit to four, split into quarters
            const imgs = await Promise.all([0, 1, 2, 3].map(idx=>{
                const img = new Image();
                img.src = `/thumbnail?type=avatar&file=${members[idx]}`;
                return new Promise(resolve=>{
                    if (img.complete) resolve(img);
                    img.addEventListener('load', ()=>resolve(img));
                    img.addEventListener('error', ()=>resolve(img));
                });
            }));
            const canvas = document.createElement('canvas');
            canvas.height = 96;
            canvas.width = 96;
            const con = canvas.getContext('2d');
            con.drawImage(
                imgs[0],
                0, 0,
                96, 96,
                0, 0,
                47, 47,
            );
            con.drawImage(
                imgs[1],
                0, 0,
                96, 96,
                49, 0,
                47, 47,
            );
            con.drawImage(
                imgs[2],
                0, 0,
                96, 96,
                0, 49,
                47, 47,
            );
            con.drawImage(
                imgs[3],
                0, 0,
                96, 96,
                49, 49,
                47, 47,
            );
            return canvas.toDataURL();
        }
    } else {
        // no avatar
        return '/img/five.png';
    }
};
const contextListener = async(evt)=>{
    if (menu) return;
    menu = true;
    evt.preventDefault();
    const ctx = document.createElement('div'); {
        ctx.classList.add('stcs--ctxBlocker');
        ctx.title = '';
        ctx.addEventListener('click', (evt)=>{
            evt.stopPropagation();
            ctx.remove();
            menu = false;
        });
        const list = document.createElement('ul'); {
            list.classList.add('stcs--ctxMenu');
            list.classList.add('list-group');
            const rect = trigger.getBoundingClientRect();
            list.style.setProperty('--stcs--y', `${rect.bottom}px`);
            list.style.left = isDiscord ? 'var(--nav-bar-width)' : `${rect.left}px`;
            const chars = [...characters, ...groups]
                .filter(it=>!settings.onlyFavorites || it.fav)
                .filter(it=>(it.avatar ?? it.id) != (currentChar?.avatar ?? currentChar?.id))
                .toSorted(compCards)
                .slice(0, settings.numCards)
            ;
            for (const c of chars) {
                const item = document.createElement('li'); {
                    item.classList.add('stcs--ctxItem');
                    item.classList.add('list-group-item');
                    if (settings.highlightFavorites && c.fav) item.classList.add('stcs--fav');
                    item.setAttribute('data-stcs--char', c.name);
                    item.title = `Switch to "${c.name}"`;
                    item.addEventListener('click', async()=>{
                        if (c.members) {
                            setActiveCharacter(null);
                            setActiveGroup(c.id);
                            openGroupById(c.id);
                        } else {
                            setActiveCharacter(characters.indexOf(c));
                            setActiveGroup(null);
                            selectCharacterById(characters.indexOf(c));
                        }
                        saveSettingsDebounced();
                    });
                    const ava = document.createElement('div'); {
                        ava.classList.add('stcs--ctxAvatar');
                        ava.style.backgroundImage = `url("${await getAvatar(c)}")`;
                        item.append(ava);
                    }
                    const name = document.createElement('div'); {
                        name.classList.add('stcs--ctxName');
                        name.textContent = c.name;
                        item.append(name);
                    }
                    list.append(item);
                }
            }
            ctx.append(list);
        }
        document.body.append(ctx);
        trigger.append(ctx);
    }
};




const checkDiscord = async()=>{
    let newIsDiscord = window.getComputedStyle(document.body).getPropertyValue('--nav-bar-width') !== '';
    if (isDiscord != newIsDiscord) {
        isDiscord = newIsDiscord;
        document.body.classList[isDiscord ? 'add' : 'remove']('stcs');
        document.body.classList[isDiscord ? 'remove' : 'add']('stcs--nonDiscord');
        if (isDiscord) {
            trigger.style.setProperty('--stcs--iconSize', 'calc(var(--nav-bar-width) - 16px)');
        } else {
            trigger.style.setProperty('--stcs--iconSize', 'calc(var(--topBarBlockSize))');
        }
    }
    setTimeout(checkDiscord, 2000);
};

const init = ()=>{
    trigger = document.querySelector('#rightNavHolder > .drawer-toggle');
    trigger.addEventListener('contextmenu', contextListener);
    eventSource.on(event_types.CHAT_CHANGED, ()=>(onChatChanged(),null));
    checkDiscord();
};
init();
