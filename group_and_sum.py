import gspread
import json
import os
from creds import *
import pandas as pd
import numpy as np


# goal of this script is to get the raw data into the format here 19H_FlvKGPrlYokHPcdlDxCY1-Wb5zFxWcKtCeMGcpls so that 
# convert_to_json can pull from there and make the final json files
# we only need to deal with the capacity related charts because they need deduplicaed capacity data

def group_and_sum(tracker, keys, tabs, chartids, gspread_creds, statuses_dict, years_dict):

    dfs = []
    for key in keys:
        for tab in tabs:
            # rename based on what tab it is
            # if tab lng leave
            # if tab power Country/Area to Country 
            # and all capacity lower case it # just decide and leave it.
            gsheets = gspread_creds.open_by_key(key) 
            sheet_names = [sheet.title for sheet in gsheets.worksheets()] 
            # print(f'this is gsheets: \n {gsheets}')
            # print(f'this is tab: {tab}')
            # print(f'this is sheet names from query: \n{sheet_names}')
            df = pd.DataFrame(gsheets.worksheet(tab).get_all_records(head=1))
            
            if 'Gas Power' in tab:
            
                df.rename(columns={'Country/Area': 'Country','CapacityRaw':'capacity', 'Start Year Low': 'Start year', 'GEM Unit ID': 'unit id'}, inplace=True)       # using CapacityRaw because no MW string          

            else:
                df.rename(columns={'Country/Area': 'Country','Capacity (mtpa)':'capacity', 'Expected start year': 'Start year', 'GEM Combo ID': 'unit id'}, inplace=True) 
                
            df = df[['capacity', 'Country', 'Start year', 'unit id', 'Status']]   
            
            # drop duplicate unit ids so remove double capacity counting!
            # print(f'len of df before drop dupe: {len(df)}')
            df.drop_duplicates(subset='unit id', ignore_index=True, inplace=True)
            
            df['capacity'] = df['capacity'].replace('', 0.0)
            # print(f'len of df after drop dupe: {len(df)}')
            # input('check drop') good alot for lng 119 to 47, gaspower 97 to 94
            # print(df.columns)
            # to keep track and identify later 
            df['tab-key-pair'] = f'{key}_{tab}' 
            # print(df)
            dfs.append(df)
            
    # unclear if helpful to concat all dfs here since gas and lng with have diff columns ... keep as a list for now
    df = pd.concat(dfs,axis=0, ignore_index=True)  
    # print(len(df))   
    # rename 
    # df.rename(columns={'Country/Area': 'Country', 'CapacityRaw':'capacity (MW)', 'Capacity (mtpa)':'capacity (mtpa)', 'Start Year Low': 'Start year_gaspower', 'Expected start year': 'Start year_lng', 'GEM Combo ID': 'unit id_lng', 'GEM Unit ID': 'unit id_gaspower'}, inplace=True)       # using CapacityRaw because no MW string          

    for ci in chartids:
        cols = ['Country', 'tab-key-pair', 'unit id']
        # Country	capacity (MW)	Start year # 25088647
        # Country	capacity (mtpa)	Start year # 25088546 
        # Country	Status	capacity (MW) # 25051458
        # Country	Status	capacity (mtpa) # 25051331   
        filtdf = pd.DataFrame()   # reset  
        if ci in [25051331]:
            
            # filter out only needed tab info 
            filtdf = df[df['tab-key-pair'].str.contains('LNG')]
            # filtdf.rename(columns={'unit id_lng': 'unit id'}, inplace=True)

            # print(set(filtdf['tab-key-pair'].to_list()))
            # print(f'this is len of filtered df: {len(filtdf)}')
            
            # print(f'these are the expected status buckets: {statuses_dict[ci]}')
                  
            cols += ['Status','capacity']
            filtdf = filtdf[cols]
            # print(f'These are the cols for {ci}: \n{cols}')
            # print(filtdf)
            
            # print(set(filtdf['capacity'].to_list()))
            # input('check it whats not a float')
            filtdf = filtdf.groupby(['Country', 'Status']).capacity.agg('sum')
            print("Resulting Series (MultiIndex):")
            print(filtdf)
            print("-" * 30)

            # Convert the result Series back to a clean DataFrame
            filtdf_reset = filtdf.reset_index(name='capacity')    
            # so we want to end up with a df that fits into the csv file with cols
            # Country ... Status ... capacity sum
            filtdf_reset.rename(columns={'capacity':'capacity (mtpa)'}, inplace=True)
            # print(f'this is filtdf_reset: {filtdf_reset}')
            # input('check it')
            
        elif ci in [25051458]:
            # filter out only needed tab info 
            filtdf = df[df['tab-key-pair'].str.contains('Gas Power')] 
            # filtdf.rename(columns={'unit id_gaspower': 'unit id'}, inplace=True)
            # print(set(filtdf['tab-key-pair'].to_list()))
            # print(f'this is len of filtered df: {len(filtdf)}')
            
            # print(f'these are the expected status buckets: {statuses_dict[ci]}')
                                        
            cols += ['Status','capacity']
            filtdf = filtdf[cols]

            # print(f'These are the cols for {ci}: \n{cols}')
            # print(filtdf)
            
            # print(set(filtdf['capacity'].to_list()))
            # input('check it whats not a float')
            filtdf = filtdf.groupby(['Country', 'Status']).capacity.agg('sum')
            print("Resulting Series (MultiIndex):")
            print(filtdf)
            print("-" * 30)
            

            # Convert the result Series back to a clean DataFrame
            filtdf_reset = filtdf.reset_index(name='capacity')    
            # so we want to end up with a df that fits into the csv file with cols
            # Country ... Status ... capacity sum
            filtdf_reset.rename(columns={'capacity':'capacity (MW)'}, inplace=True)

        elif ci in [25088546]:
            # filter out only needed tab info 
            filtdf = df[df['tab-key-pair'].str.contains('LNG')] 
            
            # filtdf.rename(columns={'Start year_lng': 'Start year', 'unit id_lng': 'unit id'}, inplace=True)
        
            # print(set(filtdf['tab-key-pair'].to_list()))
            # print(f'this is len of filtered df: {len(filtdf)}')
            # print(f'these are the expected year buckets: {years_dict[ci]}')
                           
            cols += ['capacity','Start year']
            filtdf = filtdf[cols]

            # print(f'These are the cols for {ci}: \n{cols}')
            # print(filtdf)
            
            filtdf = filtdf.groupby(['Country', 'Start year']).capacity.agg('sum')
            print("Resulting Series (MultiIndex):")
            print(filtdf)
            print("-" * 30)

            # Convert the result Series back to a clean DataFrame
            filtdf_reset = filtdf.reset_index(name='capacity')    
            
            filtdf_reset.rename(columns={'capacity':'capacity (mtpa)'}, inplace=True)

            # so we want to end up with a df that fits into the csv file with cols
            # Country ... Start year ... capacity sum
            
        elif ci in [25088647]:
            # filter out only needed tab info 
            filtdf = df[df['tab-key-pair'].str.contains('Gas Power')]  
            # filtdf.rename(columns={'Start year_gaspower': 'Start year', 'unit id_gaspower': 'unit id'}, inplace=True) # idk maybe should do it all up there before concatting but there was an issue so doing it like this for expediency

            # print(set(filtdf['tab-key-pair'].to_list()))
            # print(f'this is len of filtered df: {len(filtdf)}')   
            # print(f'these are the expected year buckets: {years_dict[ci]}')
                  
            cols += ['capacity', 'Start year']
            filtdf = filtdf[cols]

            # print(f'These are the cols for {ci}: \n{cols}')
            # print(filtdf)
            
            # so we want to end up with a df that fits into the csv file with cols
            # Country ... Start year ... capacity sum
            filtdf = filtdf.groupby(['Country', 'Start year']).capacity.agg('sum')
            print("Resulting Series (MultiIndex):")
            print(filtdf)
            print("-" * 30)

            # Convert the result Series back to a clean DataFrame
            filtdf_reset = filtdf.reset_index(name='capacity')                        
                        
            filtdf_reset.rename(columns={'capacity':'capacity (MW)'}, inplace=True)

            

                
        filtdf_reset.to_csv(f'../trackers/{tracker}-dashboard/public/assets/data_2025/groupedsummed_{tracker}_{ci}.csv', encoding='utf-8')

        print(f'Done creating group and sum csv for {ci} {tracker} chart)')

def go_gspread(client_secret_full_path):
    
    # Set up Google Sheets API credentials
    gspread_creds = gspread.oauth(
            scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
            credentials_filename=client_secret_full_path,
            # authorized_user_filename=json_token_name,
        )

    return gspread_creds 

if __name__ == "__main__":
    client_secret_full_path = os.path.expanduser("~/") + client_secret
    gspread_creds = go_gspread(client_secret_full_path)
    
    trackeracro = 'ggpft' # 'gbpt' #ggpft should be ggft but the folder is named that and I think that is what the github repo is also named so the link to heroku app would need to change...
    if 'ggpft' in trackeracro:
        seckey = '1wegxedoizkpSrcezyjrIlNnizsU4KaTTHmoN_APvgn8' 
        tabs = ['LNG Terminals', 'Gas Power Plants']
        keys = [seckey]
        # go through each chart id, make a csv with the columns
        chartids = [25051331, 25051458, 25088546, 25088647]
        # Country	capacity (MW)	Start year # 25088647
        # Country	capacity (mtpa)	Start year # 25088546 
        # Country	Status	capacity (MW) # 25051458
        # Country	Status	capacity (mtpa) # 25051331

        ## Determines what our buckets are to group and sum by... tho also built in will do it for us.But we must declare it for the json file ALL.
        years_dict = {25088546: list(range(2022,2032)),
                    25088647: list(range(2025, 2042))
                    }
        statuses_lng = ['Proposed', 'Construction', 'Shelved/shelved-inferred', 'Idle', 'Operating']
        statuses_gas = ['Announced', 'Pre-construction', 'Construction', 'Shelved/shelved-inferred']
        
        statuses_dict = {25051331: statuses_lng,
                         25051458: statuses_gas}

        
    group_and_sum(trackeracro, keys, tabs, chartids, gspread_creds, statuses_dict, years_dict)
