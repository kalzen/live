// Helper function to format date
function formatDate(date) {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
}

// Create calendar dates
function createCalendar() {
    const container = document.getElementById('calendar-dates');
    const dates = [];
    const today = new Date();
    
    // Generate dates from 2 days ago to 2 days ahead
    for (let i = -2; i <= 2; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        dates.push(date);
    }
    
    dates.forEach((date, index) => {
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const isToday = date.getDate() === today.getDate();
        
        const link = document.createElement('a');
        link.className = `Sg ph hh ${isToday ? 'Xg' : ''}`;
        link.setAttribute('data-date', formatDate(date));
        link.innerHTML = `
            <span class="${isToday ? 'Xg' : ''}">${isToday ? 'Today' : dayNames[date.getDay()]}</span>
            <span class="eh ${isToday ? 'Xg' : ''}">${date.getDate()} ${date.toLocaleString('default', { month: 'short' }).toUpperCase()}</span>
        `;
        
        link.addEventListener('click', (e) => {
            e.preventDefault();
            updateMatches(formatDate(date));
            // Update active state
            document.querySelectorAll('.Sg').forEach(a => a.classList.remove('Xg'));
            link.classList.add('Xg');
        });
        
        container.appendChild(link);
    });
}

async function fetchSportsData(date) {
    try {
        const response = await fetch(`http://api.bettests.com/api/sports?date=${date}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

async function updateMatches(date) {
    const container = document.getElementById('matches-container');
    container.innerHTML = ''; // Clear existing matches
    const data = await fetchSportsData(date);
    
    if (data && data.Stages) {
        data.Stages.forEach(stage => {
            const stageElement = createStageElement(stage);
            container.appendChild(stageElement);
        });
    }
}

function createStageElement(stage) {
    const stageDiv = document.createElement('div');
    stageDiv.className = 'stage Tf';
    
    // Create stage header with LiveScore classes
    const stageHeader = document.createElement('div');
    stageHeader.className = 'stage-header Wf';
    
    if (stage.badgeUrl) {
        const badge = document.createElement('img');
        badge.src = `https://static.livescore.com/competition/high/${stage.badgeUrl}`;
        badge.alt = stage.Snm;
        badge.className = 'Cl';
        stageHeader.appendChild(badge);
    }
    
    const stageName = document.createElement('div');
    stageName.className = 'Yf';
    stageName.innerHTML = `
        <div class="Zf">${stage.Snm}</div>
        <div class="bg">${stage.Cnm}</div>
    `;
    stageHeader.appendChild(stageName);
    stageDiv.appendChild(stageHeader);

    const eventsDiv = document.createElement('div');
    eventsDiv.className = 'events';

    stage.Events.forEach(event => {
        const eventDiv = createEventDiv(event);
        eventsDiv.appendChild(eventDiv);
    });

    stageDiv.appendChild(eventsDiv);
    return stageDiv;
}

function createEventDiv(event) {
    const eventDiv = document.createElement('div');
    eventDiv.className = 'event lr pr';
    eventDiv.addEventListener('click', () => showMatchDetails(event.Eid));
    
    const status = document.createElement('div');
    status.className = 'status xw Cw';
    status.textContent = event.Eps;
    
    const team1 = createTeamElement(event.T1[0], 'tr');
    const team2 = createTeamElement(event.T2[0], 'ur');
    const score = document.createElement('div');
    score.className = 'score zr';
    score.innerHTML = `
        <div class="Ar">${event.Tr1 || '-'}</div>
        <div class="Br">${event.Tr2 || '-'}</div>
    `;
    
    eventDiv.appendChild(status);
    eventDiv.appendChild(team1);
    eventDiv.appendChild(score);
    eventDiv.appendChild(team2);
    
    return eventDiv;
}

async function showMatchDetails(matchId) {
    const container = document.getElementById('matches-container');
    container.innerHTML = '';
    
    try {
        const [matchData, statsData, lineupsData] = await Promise.all([
            fetch(`http://api.bettests.com/api/match/${matchId}`).then(r => r.json()),
            fetch(`http://api.bettests.com/api/match/${matchId}/stats`).then(r => r.json()),
            fetch(`http://api.bettests.com/api/match/${matchId}/lineups`).then(r => r.json())
        ]);

        // Create match detail view
        const matchDetailDiv = document.createElement('div');
        matchDetailDiv.className = 'match-detail';
        matchDetailDiv.innerHTML = `
            <div class="Sf Se" data-testid="tabs-wrapper">
                <div class="Te Ue">
                    <div class="Ve tabsInner Xe">
                        <div class="Dl active" id="tab-summary">Summary</div>
                        <div class="Dl" id="tab-stats">Stats</div>
                        <div class="Dl" id="tab-lineups">Line-ups</div>
                    </div>
                </div>
                <div id="tab-content-summary" class="Ye active">
                    ${createMatchHistory(matchData)}
                </div>
                <div id="tab-content-stats" class="Ye" style="display: none">
                    ${createDetailedStats(statsData.pageProps?.initialEventData.event.statistics)}
                </div>
                <div id="tab-content-lineups" class="Ye" style="display: none">
                    ${createLineupsContent(lineupsData.pageProps?.initialEventData?.event)}
                </div>
            </div>
        `;

        // Add tab switching logic
        const tabs = matchDetailDiv.querySelectorAll('.Dl');
        const contents = matchDetailDiv.querySelectorAll('.Ye');
        
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.style.display = 'none');
                tab.classList.add('active');
                contents[index].style.display = 'block';
            });
        });

        container.appendChild(matchDetailDiv);
        
        // Add back button
        const backButton = document.createElement('button');
        backButton.className = 'back-button';
        backButton.textContent = '← Back';
        backButton.onclick = () => updateMatches(formatDate(new Date()));
        container.insertBefore(backButton, container.firstChild);

    } catch (error) {
        console.error('Error loading match details:', error);
        container.innerHTML = `<div class="error-message">Failed to load match details</div>`;
    }
}

function createDetailedStats(stats) {
    if (!stats) return '<div class="no-stats">No statistics available</div>';
    //console.log(stats);
    const statItems = [
        { key: 'shotsOnTarget', label: 'Shots on target', home: stats.shotsOnTarget[0] || 6, away: stats.shotsOnTarget[1] || 8 },
        { key: 'shotsOffTarget', label: 'Shots off target', home: stats.shotsOffTarget[0] || 9, away: stats.shotsOffTarget[1] || 11 },
        { key: 'shotsBlocked', label: 'Shots blocked', home: stats.shotsBlocked[0] || 3, away: stats.shotsBlocked[1] || 2 },
        { key: 'possession', label: 'Possession %', home: stats.possession[0] || 45, away: stats.possession[1] || 56 },
        { key: 'corners', label: 'Corners', home: stats.corners[0] || 4, away: stats.corners[1] || 5 },
        { key: 'offsides', label: 'Offsides', home: stats.offsides[0] || 4, away: stats.offsides[1] || 0 },
        { key: 'fouls', label: 'Fouls', home: stats.fouls[0] || 4, away: stats.fouls[1] || 4 },
        { key: 'throwIns', label: 'Throw ins', home: stats.throwIns[0] || 14, away: stats.throwIns[1] || 15 },
        { key: 'yellowCards', label: 'Yellow cards', home: stats.yellowCards[0] || 0, away: stats.yellowCards[1] || 0 },
        { key: 'goalkeeperSaves', label: 'Goalkeeper saves', home: stats.goalkeeperSaves[0] || 6, away: stats.goalkeeperSaves[1] || 3 },
        { key: 'goalKicks', label: 'Goal kicks', home: stats.goalKicks[0] || 12, away: stats.goalKicks[1] || 7 }
    ];

    return `
        <div class="stats-wrapper">
            ${statItems.map(item => {
                const total = Number(item.home) + Number(item.away);
                const homeWidth = total === 0 ? 50 : (Number(item.home) / total) * 100;
                const awayWidth = total === 0 ? 50 : (Number(item.away) / total) * 100;
                
                return `
                    <div id="match-detail__statistic__${item.key}" class="Mg" data-testid="match-detail_statistic_root">
                        <div class="Eg" data-testid="match-detail_statistic_header">
                            <span class="Ig" data-testid="match-detail_statistic_home-stat">${item.home}</span>
                            <div class="Pg" data-testid="match-detail_statistic_stat-name">${item.label}</div>
                            <span class="Jg Qg" data-testid="match-detail_statistic_away-stat">${item.away}</span>
                        </div>
                        <span>
                            <span class="Fg" data-testid="match-detail_statistic_stat-bar">
                                <span class="Gg" data-testid="match-detail_statistic_home">
                                    <span class="Lg" data-testid="match-detail_statistic_home-bar" style="width: ${homeWidth}%;"></span>
                                </span>
                                <div class="Og" data-testid="match-detail_statistic_compact-stat-name">${item.label}</div>
                                <span class="Hg" data-testid="match-detail_statistic_away">
                                    <span class="Kg" data-testid="match-detail_statistic_away-bar" style="width: ${awayWidth}%;"></span>
                                </span>
                            </span>
                        </span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function calculatePercentage(value1, value2) {
    const total = Number(value1) + Number(value2);
    return total === 0 ? 50 : (Number(value1) / total) * 100;
}

async function initializeApp() {
    createCalendar();
    const today = formatDate(new Date());
    await updateMatches(today);
    initCalendarPopup();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

function initCalendarPopup() {
    const calendarTrigger = document.getElementById('match-calendar-dp-trigger');
    const calendarPopup = document.getElementById('calendar-popup');
    const prevMonth = document.getElementById('prev-month');
    const nextMonth = document.getElementById('next-month');
    let currentDate = new Date();

    function renderCalendar(date) {
        const monthYear = document.getElementById('current-month');
        const grid = document.getElementById('calendar-grid');
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        monthYear.textContent = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        // Clear existing days
        const daysNodes = grid.querySelectorAll('.day');
        daysNodes.forEach(node => node.remove());

        // Add empty cells for days before first day of month
        let firstDayIndex = firstDay.getDay() || 7; // Convert Sunday from 0 to 7
        for (let i = 1; i < firstDayIndex; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day';
            grid.appendChild(emptyDay);
        }

        // Add days of month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day day';
            if (i === new Date().getDate() && date.getMonth() === new Date().getMonth()) {
                dayEl.classList.add('today');
            }
            dayEl.textContent = i;
            grid.appendChild(dayEl);
        }
    }

    function changeMonth(offset) {
        currentDate.setMonth(currentDate.getMonth() + offset);
        renderCalendar(currentDate);
    }

    calendarTrigger.addEventListener('click', () => {
        calendarPopup.classList.toggle('visible');
    });

    prevMonth.addEventListener('click', () => changeMonth(-1));
    nextMonth.addEventListener('click', () => changeMonth(1));

    renderCalendar(currentDate);
}

// Add this helper function for card icons
function getCardIcon(type) {
    if (type === 'YC') {
        return `
            <div class="Nv"> </div>
            <span class="iu">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="14" name="FootballYellowCard" data-testid="svg">
                    <rect width="10" height="14" x="2" rx="2" transform="translate(-1.68)" fill="#FFCE00" fill-rule="evenodd"></rect>
                </svg>
            </span>
        `;
    } else if (type === 'RC') {
        return `
            <div class="Nv"> </div>
            <span class="iu">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="14" name="FootballRedCard" data-testid="svg">
                    <rect width="10" height="14" x="2" rx="2" transform="translate(-1.68)" fill="#DC0000" fill-rule="evenodd"></rect>
                </svg>
            </span>
        `;
    }
    return '';
}

// Add these helper functions
function getPenaltyGoalIcon() {
    return `
        <div class="Nv">PEN</div>
        <span class="iu">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" name="FootballGoalPen" data-testid="svg">
                <g transform="translate(.63 .5)" fill="none" fill-rule="evenodd">
                    <circle cx="7" cy="7" r="6" fill="#FDFDFD"></circle>
                    // ...existing goal icon path...
                    <g transform="translate(6 6)">
                        <circle cx="4" cy="4" r="4" fill="#23DF8C" transform="matrix(1 0 0 -1 0 8)"></circle>
                        <path fill="#111111" d="M3.52 6.34c.27 0 .47-.1.6-.3l2.2-3.17c.1-.14.14-.3.14-.42a.68.68 0 00-.7-.67c-.26 0-.44.1-.6.34L3.52 4.65l-.79-.81a.65.65 0 00-.5-.22c-.4 0-.7.3-.7.68 0 .17.05.3.2.47L2.96 6.1a.7.7 0 00.56.24z"></path>
                    </g>
                </g>
            </svg>
        </span>
    `;
}

function getVarIcon(type) {
    return `
        <div class="Nv">VAR</div>
        <span class="iu">
            ${type === 'RC' ? `
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="14" name="FootballRedCard" data-testid="svg">
                    <rect width="10" height="14" x="2" rx="2" transform="translate(-1.66)" fill="#DF2357" fill-rule="evenodd"></rect>
                </svg>
            ` : getCardIcon(type)}
        </span>
    `;
}

function createMatchHistory(data) {
    const events = [];
    const incidents = data.details?.incidents?.incs;

    // Helper function to process minutes
    function processMinute(minute, minuteEvents) {
        minuteEvents.forEach(event => {
            if (event.HOME) {
                event.HOME.forEach(incident => {
                    events.push(createIncidentElement(incident, true));
                });
            }
            if (event.AWAY) {
                event.AWAY.forEach(incident => {
                    events.push(createIncidentElement(incident, false));
                });
            }
        });
    }

    // Process first half events
    if (incidents?.football1) {
        Object.entries(incidents.football1).forEach(([minute, minuteEvents]) => {
            processMinute(minute, minuteEvents);
        });
    }

    // Add half time score
    events.push(`
        <div class="vv isHighlighted" id="matchScore.halfTimeShort" data-testid="match-detail_info-rows_scores_root">
            <span class="wv">HT</span>
            <span class="xv"></span>
            <div class="zv">
                <span id="match-detail__home__score">${data.Trh1}</span>
                <span>&nbsp;-&nbsp;</span>
                <span id="match-detail__away__score">${data.Trh2}</span>
            </div>
            <span class="yv"></span>
        </div>
    `);

    // Process second half events
    if (incidents?.football2) {
        Object.entries(incidents.football2).forEach(([minute, minuteEvents]) => {
            processMinute(minute, minuteEvents);
        });
    }

    // Add full time score
    events.push(`
        <div class="vv isHighlighted" id="matchScore.fullTimeShort" data-testid="match-detail_info-rows_scores_root">
            <span class="wv">FT</span>
            <span class="xv"></span>
            <div class="zv">
                <span id="match-detail__home__score">${data.Tr1}</span>
                <span>&nbsp;-&nbsp;</span>
                <span id="match-detail__away__score">${data.Tr2}</span>
            </div>
            <span class="yv"></span>
        </div>
    `);

    return `<div class="Oo">${events.join('')}</div>`;
}

function createIncidentElement(incident, isHome) {
    const icon = getIncidentIcon(incident);
    const assistText = incident.assist ? 
        `<span class="Jv">${incident.assist[0].name}</span>` : 
        '';

    return `
        <div class="Gv">
            <span class="Lv">${incident.time}</span>
            <div class="Hv ${isHome ? 'homeContent' : 'awayContent'}">
                <div class="Ov ${isHome ? 'homePlayer' : 'awayPlayer'}">
                    ${isHome ? `
                        <a class="Cs" href="/en/season-stats/${incident.playerNameSlug}/${incident.playerId}/">
                            <span class="Iv">${incident.name}</span>
                        </a>
                        ${assistText}
                    ` : '<span class="Iv"></span>'}
                </div>
                <div class="Mv ${isHome ? 'homeIcon' : 'awayIcon'}">
                    ${isHome ? icon : ''}
                </div>
            </div>
            <div class="Kv">
                ${incident.score ? `
                    <span>${incident.score.home} - ${incident.score.away}</span>
                ` : ''}
            </div>
            <div class="Hv ${isHome ? 'awayContent' : 'homeContent'}">
                <div class="Mv ${isHome ? 'awayIcon' : 'homeIcon'}">
                    ${!isHome ? icon : ''}
                </div>
                <div class="Ov ${isHome ? 'awayPlayer' : 'homePlayer'}">
                    ${!isHome ? `
                        <a class="Cs" href="/en/season-stats/${incident.playerNameSlug}/${incident.playerId}/">
                            <span class="Iv">${incident.name}</span>
                        </a>
                        ${assistText}
                    ` : '<span class="Iv"></span>'}
                </div>
            </div>
        </div>
    `;
}

function getIncidentIcon(incident) {
    switch (incident.type) {
        case 'FootballYellowCard':
            return getCardIcon('YC');
        case 'FootballRedCard':
            return incident.varLabel ? getVarIcon('RC') : getCardIcon('RC');
        case 'FootballGoalPen':
            return getPenaltyGoalIcon();
        case 'FootballGoal':
            return getGoalEventIcon();
        default:
            return '';
    }
}

function createTeamElement(team, className) {
    const teamDiv = document.createElement('div');
    teamDiv.className = `team ${className}`;
    
    if (team.Img) {
        const img = document.createElement('img');
        img.src = `https://lsm-static-prod.livescore.com/medium/${team.Img}`;
        img.alt = team.Nm;
        img.className = 'Er';
        teamDiv.appendChild(img);
    }
    
    const name = document.createElement('div');
    name.className = 'vr';
    name.textContent = team.Nm;
    teamDiv.appendChild(name);
    
    return teamDiv;
}

function createLineupsContent(data) {
    if (!data) {
        console.log('No data available');
        return '<div class="no-lineups">No lineup information available</div>';
    }

    // Extract team names and formations from the event data
    const teamNames = {
        home: data.homeTeamName,
        away: data.awayTeamName
    };

    const formations = {
        home: data.fieldData?.homeFormation || '4-4-2',
        away: data.fieldData?.awayFormation || '4-4-2'
    };

    // Extract lineups data
    const lineups = {
        home: {
            teamName: teamNames.home,
            formation: formations.home,
            players: {
                starting: data.lineups?.homeStarters || [],
                substitutes: data.lineups?.homeSubs || []
            }
        },
        away: {
            teamName: teamNames.away,
            formation: formations.away,
            players: {
                starting: data.lineups?.awayStarters || [],
                substitutes: data.lineups?.awaySubs || []
            }
        }
    };

    return `
        <div class="tp">
            <span class="up">
                <span id="home-team__name__top" class="Hp">${lineups.home.teamName}</span>
                <span id="home-team__formation__top">${lineups.home.formation}</span>
            </span>
            
            <div class="Ip">
                <div class="Jp">
                    ${createFormationRows(lineups.home.players.starting, true)}
                </div>
                <div class="Kp">
                    ${createFormationRows(lineups.away.players.starting, false)}
                </div>
                <div class="Mp">
                    <div class="Np"></div>
                    <div class="Op"></div>
                    <div class="Pp"></div>
                    <div class="Qp"></div>
                </div>
                <div class="Rp"></div>
                <div class="Sp"></div>
                <div class="Tp"></div>
                <div class="Vp Xp"><div class="Up"></div></div>
                <div class="Yp Xp"></div>
                <div class="Vp Wp"><div class="Up"></div></div>
                <div class="Yp Wp"></div>
            </div>
            
            <span class="up">
                <span id="away-team__name__bottom" class="Hp">${lineups.away.teamName}</span>
                <span id="away-team__formation__bottom">${lineups.away.formation}</span>
            </span>
        </div>
    `;
}

function createFormationRows(players, isHome) {
    // Group players by their fieldPosition rows
    const rows = {};
    players.forEach(player => {
        const [row] = player.fieldPosition.split(':');
        if (!rows[row]) rows[row] = [];
        rows[row].push(player);
    });

    return Object.entries(rows)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([_, rowPlayers]) => `
            <span class="Lp">
                ${rowPlayers.map(player => createPlayerElement(player, isHome)).join('')}
            </span>
        `).join('');
}

function createPlayerElement(player, isHome) {
    if (!player || !player.name) {
        console.log('Invalid player data:', player);
        return '';
    }

    const playerClass = player.position === 'GOALKEEPER' ? 
        (isHome ? 'zp' : 'Bp') : 
        (isHome ? 'Ap' : 'Cp');
        
    const indicators = [];
    
    // Add goal indicator if player has a goal
    if (player.goal) {
        indicators.push(`
            <span class="Dp">
                <span class="iu">
                    ${getGoalEventIcon()}
                    ${player.goal.amt > 1 ? `<span class="ju">${player.goal.amt}</span>` : ''}
                </span>
            </span>
        `);
    }
    
    // Add substitution indicator if player was substituted
    if (player.sub && player.sub.subType === 'FootballSubOut') {
        indicators.push(`
            <span class="Fp">
                <span class="iu">
                    <svg viewBox="0 0 14 14" fill="red" name="FootballSubOut">
                        <path fill="#df2357" d="M14 7A7 7 0 110 7a7 7 0 0114 0z"></path>
                        <path fill="#111111" d="M9 3.5V7h1.44a.25.25 0 01.19.42l-3.26 3.66a.5.5 0 01-.74 0L3.37 7.42A.25.25 0 013.56 7H5V3.5c0-.28.22-.5.5-.5h3c.28 0 .5.22.5.5z"></path>
                    </svg>
                </span>
            </span>
        `);
    }

    return `
        <div class="vp">
            <a class="Cs" href="/en/season-stats/${player.playerNameSlug}/${player.id}/">
                <div class="xp">
                    <span class="yp ${playerClass}">
                        ${indicators.join('')}
                        ${player.number}
                    </span>
                </div>
                <span class="Hp">${player.name}</span>
            </a>
        </div>
    `;
}

function createSubstitutesList(substitutes = []) {
    if (!substitutes.length) return '<div class="no-subs">No substitutes</div>';
    
    return substitutes.map(player => `
        <div class="substitute">
            <span class="substitute-number">${player.shirtNumber || '-'}</span>
            <span class="substitute-name">${player.name || 'Unknown Player'}</span>
            ${player.substituteTime ? `<span class="sub-in">(${player.substituteTime}')</span>` : ''}
        </div>
    `).join('');
}

async function initializeApp() {
    createCalendar();
    const today = formatDate(new Date());
    await updateMatches(today);
    initCalendarPopup();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

function initCalendarPopup() {
    const calendarTrigger = document.getElementById('match-calendar-dp-trigger');
    const calendarPopup = document.getElementById('calendar-popup');
    const prevMonth = document.getElementById('prev-month');
    const nextMonth = document.getElementById('next-month');
    let currentDate = new Date();

    function renderCalendar(date) {
        const monthYear = document.getElementById('current-month');
        const grid = document.getElementById('calendar-grid');
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        monthYear.textContent = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        // Clear existing days
        const daysNodes = grid.querySelectorAll('.day');
        daysNodes.forEach(node => node.remove());

        // Add empty cells for days before first day of month
        let firstDayIndex = firstDay.getDay() || 7; // Convert Sunday from 0 to 7
        for (let i = 1; i < firstDayIndex; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day';
            grid.appendChild(emptyDay);
        }

        // Add days of month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day day';
            if (i === new Date().getDate() && date.getMonth() === new Date().getMonth()) {
                dayEl.classList.add('today');
            }
            dayEl.textContent = i;
            grid.appendChild(dayEl);
        }
    }

    function changeMonth(offset) {
        currentDate.setMonth(currentDate.getMonth() + offset);
        renderCalendar(currentDate);
    }

    calendarTrigger.addEventListener('click', () => {
        calendarPopup.classList.toggle('visible');
    });

    prevMonth.addEventListener('click', () => changeMonth(-1));
    nextMonth.addEventListener('click', () => changeMonth(1));

    renderCalendar(currentDate);
}

// Add these helper functions for different event types
function getEventIcon(type, isVAR = false) {
    if (isVAR) {
        return getVarIcon(type);
    }
    switch (type) {
        case 'YC':
            return getCardIcon('YC');
        case 'RC':
            return getCardIcon('RC');
        case 'PEN':
            return getPenaltyGoalIcon();
        default:
            return getGoalEventIcon();
    }
}

function createMatchEvent(incident, isHome) {
    const mainActor = incident.Incs?.[0] || incident;
    const assist = incident.Incs?.[1];
    const hasScore = incident.Sc && (incident.Sc[0] !== undefined || incident.Sc[1] !== undefined);
    
    // Determine event type and icon
    const eventType = incident.Type || incident.type || 
                     (incident.IT === 45 ? 'FootballYellowCard' : 
                      incident.IT === 46 ? 'FootballRedCard' : 
                      incident.IT === 37 ? 'FootballGoalPen' : 'FootballGoal');

    let icon;
    switch (eventType) {
        case 'FootballYellowCard':
            icon = getCardIcon('YC');
            break;
        case 'FootballRedCard':
            icon = getCardIcon('RC');
            break;
        case 'FootballGoalPen':
            icon = getPenaltyGoalIcon();
            break;
        case 'FootballGoal':
            icon = getGoalEventIcon();
            break;
        default:
            icon = incident.type === 'FootballYellowCard' ? getCardIcon('YC') : getGoalEventIcon();
    }

    const playerContent = (player, assist) => `
        ${player.Pnt ? `
            <a class="Cs" href="/en/season-stats/${player.Pnt}/${player.ID}/">
                <span class="Iv">${player.Pn?.replace(/\s/g, '&nbsp;')}</span>
            </a>
            ${assist && (eventType === 'FootballGoal' || eventType === 'FootballGoalPen') ? 
              `<span class="Jv">${assist.Pn?.replace(/\s/g, '&nbsp;')}</span>` : 
              ''}
        ` : `<span class="Iv">${player.Pn?.replace(/\s/g, '&nbsp;') || ''}</span>`}
    `;

    return `
        <div id="match-detail__event__0-${mainActor.ID || 'undefined'}" class="Gv">
            <span class="Lv">${mainActor.MinEx ? `${mainActor.Min} + ${mainActor.MinEx}` : `${mainActor.Min}'`}</span>
            <div class="Hv ${isHome ? 'homeContent' : 'awayContent'}">
                <div class="Ov ${isHome ? 'homePlayer' : 'awayPlayer'}">
                    ${isHome ? playerContent(mainActor, assist) : '<span class="Iv"></span>'}
                </div>
                <div class="Mv ${isHome ? 'homeIcon' : 'awayIcon'}">
                    ${isHome ? icon : ''}
                </div>
            </div>
            <div class="Kv">
                <span>${hasScore ? `${incident.Sc[0]} - ${incident.Sc[1]}` : ''}</span>
            </div>
            <div class="Hv ${isHome ? 'awayContent' : 'homeContent'}">
                <div class="Mv ${isHome ? 'awayIcon' : 'homeIcon'}">
                    ${!isHome ? icon : ''}
                </div>
                <div class="Ov ${isHome ? 'awayPlayer' : 'homePlayer'}">
                    ${!isHome ? playerContent(mainActor, assist) : '<span class="Iv"></span>'}
                </div>
            </div>
        </div>
    `;
}

function createMatchHistory(data) {
    const events = [];
    
    // Process first half events
    if (data['Incs-s'] && data['Incs-s']['1']) {
        data['Incs-s']['1'].forEach(incident => {
            console.log(incident);
            const isHome = incident.Nm === 1;
            events.push(createMatchEvent(incident, isHome));
        });
    }

    // Add half time score
    events.push(`
        <div class="vv isHighlighted" id="matchScore.halfTimeShort" data-testid="match-detail_info-rows_scores_root">
            <span class="wv">HT</span>
            <span class="xv"></span>
            <div class="zv">
                <span id="match-detail__home__score">${data.Trh1}</span>
                <span>&nbsp;-&nbsp;</span>
                <span id="match-detail__away__score">${data.Trh2}</span>
            </div>
            <span class="yv"></span>
        </div>
    `);

    // Process second half events
    if (data['Incs-s'] && data['Incs-s']['2']) {
        data['Incs-s']['2'].forEach(incident => {
            const isHome = incident.Nm === 1;
            events.push(createMatchEvent(incident, isHome));
        });
    }

    // Add full time score
    events.push(`
        <div class="vv isHighlighted" id="matchScore.fullTimeShort" data-testid="match-detail_info-rows_scores_root">
            <span class="wv">FT</span>
            <span class="xv"></span>
            <div class="zv">
                <span id="match-detail__home__score">${data.Tr1}</span>
                <span>&nbsp;-&nbsp;</span>
                <span id="match-detail__away__score">${data.Tr2}</span>
            </div>
            <span class="yv"></span>
        </div>
    `);

    return `<div class="Oo">${events.join('')}</div>`;
}

function getGoalEventIcon() {
    return `
        <div class="Nv"> </div>
        <span class="iu">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="14" name="FootballGoal" data-testid="svg">
                <g transform="translate(.63)" fill="none" fill-rule="evenodd">
                    <circle cx="7" cy="7" r="6" fill="#FDFDFD"></circle>
                    <path fill="#222" d="M7 0h.28H7a6.8 6.8 0 01.56.02l.14.01.25.03h.02l.04.01.22.04.13.02.14.03.13.03.24.06.08.03.23.07.04.01.53.2.03.01c.95.42 1.8 1.03 2.47 1.8a5.96 5.96 0 01.62.82l.08.13.06.1c.42.7.72 1.49.87 2.32l.02.07a7.47 7.47 0 01.07 1.85 6.97 6.97 0 01-.94 2.9l-.03.05-.08.13.1-.18-.2.34-.03.04-.37.5-.04.03c-.12.16-.26.3-.4.45l-.05.05-.12.12-.4.35-.07.05-.19.15-.04.02v.01l-.25.17.25-.18a7.3 7.3 0 01-1.67.9l-.05.02-.22.08-.06.02a5.9 5.9 0 01-.37.1l-.16.04a6.95 6.95 0 01-3.11.01l-.06-.01-.15-.04-.09-.02-.03-.01a6.16 6.16 0 01-.24-.07l-.09-.03-.2-.07-.06-.02a7.96 7.96 0 01-.24-.1h-.03c-.5-.22-.96-.48-1.38-.79h-.01l-.04-.03-.2-.16.24.18a6.66 6.66 0 01-.82-.7l-.05-.04a6.47 6.47 0 01-.4-.45l-.04-.04A6.97 6.97 0 01.03 7.66a7.5 7.5 0 010-1.34l.02-.13.01-.11.04-.27.02-.11c.16-.82.45-1.59.87-2.28l.06-.1.08-.13A6.94 6.94 0 014.22.58l.04-.02.51-.2.06-.01.23-.08.06-.01.25-.07c.05 0 .09-.02.13-.03l.14-.03.13-.02L6 .07h.06L6.3.03h.14A3.85 3.85 0 017 0zm1.88 1.3L7.44 2.45a.7.7 0 01-.8.05l-.08-.05L5.12 1.3a6 6 0 00-2.96 2.16l.65 1.72a.7.7 0 01-.2.78L2.54 6 1 7.02v.2a5.96 5.96 0 001.14 3.29l1.83-.09a.7.7 0 01.68.43l.03.09.49 1.77a5.94 5.94 0 003.66 0l.49-1.77a.7.7 0 01.62-.51h.09l1.84.08A5.96 5.96 0 0013 7.02l-1.54-1.01a.7.7 0 01-.3-.75l.03-.08.65-1.72A6.01 6.01 0 008.88 1.3zM7.4 4.5l1.84 1.33c.24.18.35.5.25.79l-.7 2.16a.7.7 0 01-.66.48H5.86a.7.7 0 01-.66-.48l-.7-2.16a.7.7 0 01.25-.78L6.59 4.5a.7.7 0 01.82 0z"></path>
                </g>
            </svg>
        </span>
    `;
}
